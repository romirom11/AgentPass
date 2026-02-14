/**
 * Audit log routes.
 *
 * GET  /audit                 — list all audit entries for owner
 * POST /passports/:id/audit   — append an audit entry
 * GET  /passports/:id/audit   — list audit entries with pagination
 */

import crypto from "node:crypto";
import { Hono } from "hono";
import { z } from "zod";
import type { Sql } from "../db/schema.js";
import { zValidator, getValidatedBody } from "../middleware/validation.js";
import { requireAuth, type OwnerPayload, type AuthVariables } from "../middleware/auth.js";

// --- Zod schemas ---

const AppendAuditSchema = z.object({
  action: z.string().min(1, "Action is required"),
  service: z.string().optional().default(""),
  method: z.string().optional().default(""),
  result: z.enum(["success", "failure", "pending_approval", "resolved_by_owner"]).default("success"),
  duration_ms: z.number().int().min(0).optional().default(0),
  details: z.record(z.unknown()).optional(),
});

type AppendAuditBody = z.infer<typeof AppendAuditSchema>;

// --- Row types ---

interface AuditRow {
  id: string;
  passport_id: string;
  action: string;
  service: string;
  method: string;
  result: string;
  duration_ms: number;
  details: Record<string, unknown> | null;
  created_at: Date;
}

function mapAuditRow(row: AuditRow) {
  return {
    id: row.id,
    passport_id: row.passport_id,
    action: row.action,
    service: row.service,
    method: row.method,
    result: row.result,
    duration_ms: row.duration_ms,
    details: row.details,
    created_at: row.created_at.toISOString(),
  };
}

/**
 * Create the global audit router (mounted at /audit).
 */
export function createAuditListRouter(db: Sql): Hono<{ Variables: AuthVariables }> {
  const router = new Hono<{ Variables: AuthVariables }>();

  // GET / — list all audit entries for owner's passports with pagination
  router.get("/", requireAuth(), async (c) => {
    const owner = c.get("owner") as OwnerPayload;
    const limit = Math.min(Math.max(parseInt(c.req.query("limit") || "50", 10) || 50, 1), 200);
    const offset = Math.max(parseInt(c.req.query("offset") || "0", 10) || 0, 0);

    const rows = await db<AuditRow[]>`
      SELECT a.* FROM audit_log a
      JOIN passports p ON a.passport_id = p.id
      WHERE p.owner_email = ${owner.email}
      ORDER BY a.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const totalRows = await db<{ count: number }[]>`
      SELECT COUNT(*) as count FROM audit_log a
      JOIN passports p ON a.passport_id = p.id
      WHERE p.owner_email = ${owner.email}
    `;
    const total = Number(totalRows[0].count);

    return c.json({
      entries: rows.map(mapAuditRow),
      total,
      limit,
      offset,
    });
  });

  return router;
}

/**
 * Create the passport-scoped audit router (mounted at /passports).
 */
export function createAuditRouter(db: Sql): Hono<{ Variables: AuthVariables }> {
  const router = new Hono<{ Variables: AuthVariables }>();

  async function getPassportOwner(passportId: string): Promise<string | null> {
    const rows = await db<{ owner_email: string }[]>`
      SELECT owner_email FROM passports WHERE id = ${passportId}
    `;
    return rows[0]?.owner_email ?? null;
  }

  // POST /:id/audit — append audit entry
  router.post("/:id/audit", requireAuth(), zValidator(AppendAuditSchema), async (c) => {
    const owner = c.get("owner") as OwnerPayload;
    const passportId = c.req.param("id");

    const ownerEmail = await getPassportOwner(passportId);
    if (!ownerEmail) {
      return c.json(
        { error: "Passport not found", code: "NOT_FOUND" },
        404,
      );
    }

    if (ownerEmail !== owner.email) {
      return c.json(
        { error: "Access denied", code: "FORBIDDEN" },
        403,
      );
    }

    const body = getValidatedBody<AppendAuditBody>(c);
    const entryId = crypto.randomUUID();

    const detailsJson = body.details ? JSON.stringify(body.details) : null;
    const result = await db<{ created_at: Date }[]>`
      INSERT INTO audit_log (id, passport_id, action, service, method, result, duration_ms, details)
      VALUES (${entryId}, ${passportId}, ${body.action}, ${body.service}, ${body.method}, ${body.result}, ${body.duration_ms}, ${detailsJson}::jsonb)
      RETURNING created_at
    `;

    return c.json({ id: entryId, created_at: result[0].created_at.toISOString() }, 201);
  });

  // GET /:id/audit — list audit entries with pagination
  router.get("/:id/audit", requireAuth(), async (c) => {
    const owner = c.get("owner") as OwnerPayload;
    const passportId = c.req.param("id");

    const ownerEmail = await getPassportOwner(passportId);
    if (!ownerEmail) {
      return c.json(
        { error: "Passport not found", code: "NOT_FOUND" },
        404,
      );
    }

    if (ownerEmail !== owner.email) {
      return c.json(
        { error: "Access denied", code: "FORBIDDEN" },
        403,
      );
    }

    const limit = Math.min(Math.max(parseInt(c.req.query("limit") || "50", 10) || 50, 1), 200);
    const offset = Math.max(parseInt(c.req.query("offset") || "0", 10) || 0, 0);

    const rows = await db<AuditRow[]>`
      SELECT * FROM audit_log
      WHERE passport_id = ${passportId}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const totalRows = await db<{ count: number }[]>`
      SELECT COUNT(*) as count FROM audit_log WHERE passport_id = ${passportId}
    `;
    const total = Number(totalRows[0].count);

    return c.json({
      entries: rows.map(mapAuditRow),
      total,
      limit,
      offset,
    });
  });

  return router;
}
