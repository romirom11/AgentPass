/**
 * CoinPay OAuth 2.0 / OIDC integration routes.
 *
 * GET  /auth/coinpay/login    — Redirect to CoinPay authorization
 * GET  /auth/coinpay/callback — Handle OAuth callback, create/login owner
 * GET  /auth/coinpay/userinfo — Get CoinPay user info (requires AgentPass JWT)
 *
 * Uses authorization code flow with PKCE for security.
 * On successful auth, creates or links an AgentPass owner account.
 */

import crypto from "node:crypto";
import { Hono } from "hono";
import type { Sql } from "../db/schema.js";
import { signJwt, requireAuth, type AuthVariables } from "../middleware/auth.js";

// --- Configuration ---

const COINPAY_BASE_URL = process.env.COINPAY_BASE_URL || "https://coinpayportal.com";
const COINPAY_CLIENT_ID = process.env.COINPAY_OAUTH_CLIENT_ID || "";
const COINPAY_CLIENT_SECRET = process.env.COINPAY_OAUTH_CLIENT_SECRET || "";
const COINPAY_REDIRECT_URI = process.env.COINPAY_REDIRECT_URI || "";
const COINPAY_SCOPES = "openid profile email did wallet:read";

// Dashboard URL for post-login redirect
const DASHBOARD_URL = process.env.DASHBOARD_URL || "http://localhost:3847";

// In-memory PKCE store (short-lived, keyed by state)
// In production, use Redis or similar
const pkceStore = new Map<string, { verifier: string; expiresAt: number }>();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of pkceStore) {
    if (val.expiresAt < now) pkceStore.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Generate PKCE code verifier and challenge.
 */
function generatePkce(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
  return { verifier, challenge };
}

/**
 * Create the CoinPay OAuth router.
 */
export function createCoinPayOAuthRouter(db: Sql): Hono<{ Variables: AuthVariables }> {
  const router = new Hono<{ Variables: AuthVariables }>();

  // GET /auth/coinpay/login — Redirect to CoinPay authorization
  router.get("/coinpay/login", (c) => {
    if (!COINPAY_CLIENT_ID) {
      return c.json({ error: "CoinPay OAuth not configured", code: "OAUTH_NOT_CONFIGURED" }, 500);
    }

    const state = crypto.randomBytes(16).toString("hex");
    const { verifier, challenge } = generatePkce();

    // Store PKCE verifier (10 minute TTL)
    pkceStore.set(state, {
      verifier,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    const authUrl = new URL(`${COINPAY_BASE_URL}/api/oauth/authorize`);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", COINPAY_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", COINPAY_REDIRECT_URI);
    authUrl.searchParams.set("scope", COINPAY_SCOPES);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", challenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    return c.redirect(authUrl.toString());
  });

  // GET /auth/coinpay/callback — Handle OAuth callback
  router.get("/coinpay/callback", async (c) => {
    const code = c.req.query("code");
    const state = c.req.query("state");
    const error = c.req.query("error");

    if (error) {
      return c.redirect(`${DASHBOARD_URL}/login?error=coinpay_${error}`);
    }

    if (!code || !state) {
      return c.redirect(`${DASHBOARD_URL}/login?error=missing_params`);
    }

    // Retrieve and validate PKCE verifier
    const pkce = pkceStore.get(state);
    if (!pkce || pkce.expiresAt < Date.now()) {
      pkceStore.delete(state!);
      return c.redirect(`${DASHBOARD_URL}/login?error=invalid_state`);
    }
    pkceStore.delete(state!);

    try {
      // Exchange authorization code for tokens
      const tokenRes = await fetch(`${COINPAY_BASE_URL}/api/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: COINPAY_REDIRECT_URI,
          client_id: COINPAY_CLIENT_ID,
          client_secret: COINPAY_CLIENT_SECRET,
          code_verifier: pkce.verifier,
        }),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.text();
        console.error("[CoinPay OAuth] Token exchange failed:", err);
        return c.redirect(`${DASHBOARD_URL}/login?error=token_exchange_failed`);
      }

      const tokens = await tokenRes.json() as {
        access_token: string;
        refresh_token?: string;
        id_token?: string;
        scope?: string;
      };

      // Fetch user info from CoinPay
      const userRes = await fetch(`${COINPAY_BASE_URL}/api/oauth/userinfo`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!userRes.ok) {
        console.error("[CoinPay OAuth] UserInfo failed:", await userRes.text());
        return c.redirect(`${DASHBOARD_URL}/login?error=userinfo_failed`);
      }

      const userInfo = await userRes.json() as {
        sub: string;
        name?: string;
        email?: string;
        email_verified?: boolean;
        did?: string;
        wallets?: Array<{ address: string; chain: string; label?: string }>;
      };

      // Find or create owner account
      const owner = await findOrCreateOwner(db, userInfo);

      // Store CoinPay link (DID, wallets, etc.)
      await storeCoinPayLink(db, owner.id, userInfo, tokens.access_token, tokens.refresh_token);

      // Generate AgentPass JWT
      const jwt = await signJwt({
        owner_id: owner.id,
        email: owner.email,
      });

      // Redirect to dashboard with token
      return c.redirect(`${DASHBOARD_URL}/auth/callback?token=${jwt}`);

    } catch (err) {
      console.error("[CoinPay OAuth] Error:", err);
      return c.redirect(`${DASHBOARD_URL}/login?error=oauth_error`);
    }
  });

  // GET /auth/coinpay/userinfo — Get linked CoinPay info
  router.get("/coinpay/userinfo", requireAuth(), async (c) => {
    const owner = c.get("owner");

    const rows = await db`
      SELECT coinpay_sub, coinpay_did, coinpay_wallets, linked_at
      FROM coinpay_links
      WHERE owner_id = ${owner.owner_id}
      ORDER BY linked_at DESC
      LIMIT 1
    `;

    if (rows.length === 0) {
      return c.json({ linked: false });
    }

    return c.json({
      linked: true,
      coinpay_sub: rows[0].coinpay_sub,
      did: rows[0].coinpay_did,
      wallets: rows[0].coinpay_wallets,
      linked_at: rows[0].linked_at,
    });
  });

  return router;
}

// --- Helper functions ---

interface OwnerRecord {
  id: string;
  email: string;
  name: string;
}

/**
 * Find existing owner by CoinPay sub or email, or create a new one.
 */
async function findOrCreateOwner(
  db: Sql,
  userInfo: { sub: string; email?: string; name?: string },
): Promise<OwnerRecord> {
  // First, check if there's already a linked CoinPay account
  const linked = await db<{ owner_id: string }[]>`
    SELECT owner_id FROM coinpay_links WHERE coinpay_sub = ${userInfo.sub} LIMIT 1
  `;

  if (linked.length > 0) {
    const owners = await db<OwnerRecord[]>`
      SELECT id, email, name FROM owners WHERE id = ${linked[0].owner_id} LIMIT 1
    `;
    if (owners.length > 0) return owners[0];
  }

  // Check if owner exists by email
  if (userInfo.email) {
    const existing = await db<OwnerRecord[]>`
      SELECT id, email, name FROM owners WHERE email = ${userInfo.email} LIMIT 1
    `;
    if (existing.length > 0) return existing[0];
  }

  // Create new owner (no password — OAuth-only account)
  const ownerId = crypto.randomUUID();
  const email = userInfo.email || `coinpay_${userInfo.sub}@agentpass.space`;
  const name = userInfo.name || "CoinPay User";

  // Use a random password hash for OAuth-only accounts (they can't login with password)
  const randomHash = `$coinpay$${crypto.randomBytes(32).toString("hex")}`;

  await db`
    INSERT INTO owners (id, email, password_hash, name, verified)
    VALUES (${ownerId}, ${email}, ${randomHash}, ${name}, ${!!userInfo.email})
  `;

  return { id: ownerId, email, name };
}

/**
 * Store/update CoinPay link for an owner.
 */
async function storeCoinPayLink(
  db: Sql,
  ownerId: string,
  userInfo: { sub: string; did?: string; wallets?: Array<{ address: string; chain: string }> },
  accessToken: string,
  refreshToken?: string,
): Promise<void> {
  const walletsJson = JSON.stringify(userInfo.wallets || []);

  // Upsert: update if coinpay_sub already linked to this owner
  await db`
    INSERT INTO coinpay_links (id, owner_id, coinpay_sub, coinpay_did, coinpay_wallets, access_token, refresh_token, linked_at)
    VALUES (
      ${crypto.randomUUID()},
      ${ownerId},
      ${userInfo.sub},
      ${userInfo.did || null},
      ${walletsJson}::jsonb,
      ${accessToken},
      ${refreshToken || null},
      NOW()
    )
    ON CONFLICT (coinpay_sub)
    DO UPDATE SET
      coinpay_did = EXCLUDED.coinpay_did,
      coinpay_wallets = EXCLUDED.coinpay_wallets,
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      linked_at = NOW()
  `;
}
