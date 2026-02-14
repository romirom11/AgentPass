/**
 * API key management routes.
 *
 * POST   /api-keys     - Create a new API key (JWT auth only)
 * GET    /api-keys     - List API keys (prefix only, never full key)
 * DELETE /api-keys/:id - Soft revoke an API key
 *
 * All routes require JWT authentication — API keys cannot create or manage other API keys.
 */

import crypto from "node:crypto";
import { Hono } from "hono";
import { z } from "zod";
import bcrypt from "bcryptjs";
import type { Sql } from "../db/schema.js";
import { zValidator, getValidatedBody } from "../middleware/validation.js";
import { requireAuth, type OwnerPayload, type AuthVariables } from "../middleware/auth.js";
import { generateApiKey, extractKeyPrefix } from "../utils/api-key.js";

// --- Zod schemas ---

const CreateApiKeySchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(64, "Name must be 64 characters or fewer"),
});

type CreateApiKeyBody = z.infer<typeof CreateApiKeySchema>;

// --- Row types ---

interface ApiKeyRow {
  id: string;
  owner_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  last_used: Date | null;
  created_at: Date;
  revoked_at: Date | null;
}

// --- Constants ---

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Create the API keys router bound to the given database instance.
 *
 * All routes use JWT-only auth (requireAuth() without db parameter).
 */
export function createApiKeysRouter(db: Sql): Hono<{ Variables: AuthVariables }> {
  const router = new Hono<{ Variables: AuthVariables }>();

  // POST /api-keys — create a new API key
  router.post("/", requireAuth(), zValidator(CreateApiKeySchema), async (c) => {
    const owner = c.get("owner") as OwnerPayload;
    const body = getValidatedBody<CreateApiKeyBody>(c);

    const fullKey = generateApiKey();
    const keyPrefix = extractKeyPrefix(fullKey);
    const keyHash = await bcrypt.hash(fullKey, BCRYPT_SALT_ROUNDS);
    const keyId = crypto.randomUUID();

    const result = await db<{ created_at: Date }[]>`
      INSERT INTO api_keys (id, owner_id, name, key_prefix, key_hash)
      VALUES (${keyId}, ${owner.owner_id}, ${body.name}, ${keyPrefix}, ${keyHash})
      RETURNING created_at
    `;

    return c.json(
      {
        id: keyId,
        name: body.name,
        key: fullKey,
        key_prefix: keyPrefix,
        created_at: result[0].created_at.toISOString(),
      },
      201,
    );
  });

  // GET /api-keys — list all API keys for the owner
  router.get("/", requireAuth(), async (c) => {
    const owner = c.get("owner") as OwnerPayload;

    const rows = await db<ApiKeyRow[]>`
      SELECT id, owner_id, name, key_prefix, last_used, created_at, revoked_at
      FROM api_keys
      WHERE owner_id = ${owner.owner_id}
      ORDER BY created_at DESC
    `;

    const keys = rows.map((row) => ({
      id: row.id,
      name: row.name,
      key_prefix: row.key_prefix,
      last_used: row.last_used?.toISOString() ?? null,
      created_at: row.created_at.toISOString(),
      revoked_at: row.revoked_at?.toISOString() ?? null,
    }));

    return c.json({ api_keys: keys });
  });

  // DELETE /api-keys/:id — soft revoke an API key
  router.delete("/:id", requireAuth(), async (c) => {
    const owner = c.get("owner") as OwnerPayload;
    const keyId = c.req.param("id");

    const rows = await db<Pick<ApiKeyRow, "id" | "owner_id" | "revoked_at">[]>`
      SELECT id, owner_id, revoked_at FROM api_keys WHERE id = ${keyId}
    `;
    const row = rows[0];

    if (!row) {
      return c.json(
        { error: "API key not found", code: "NOT_FOUND" },
        404,
      );
    }

    if (row.owner_id !== owner.owner_id) {
      return c.json(
        { error: "Access denied", code: "FORBIDDEN" },
        403,
      );
    }

    if (row.revoked_at) {
      return c.json(
        { error: "API key already revoked", code: "ALREADY_REVOKED" },
        409,
      );
    }

    await db`
      UPDATE api_keys SET revoked_at = NOW() WHERE id = ${keyId}
    `;

    return c.json({ revoked: true });
  });

  return router;
}
