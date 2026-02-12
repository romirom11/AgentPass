/**
 * Telegram webhook and linking routes.
 *
 * Provides:
 * - POST /telegram/webhook — Telegram webhook endpoint for production mode
 * - GET /telegram/link/:email — Generate deep link to bot with pre-filled email
 */

import { Hono } from "hono";

export function createTelegramRouter(): Hono {
  const router = new Hono();

  /**
   * POST /webhook
   *
   * Telegram webhook endpoint for production mode.
   * This endpoint receives updates from Telegram when the bot is in webhook mode.
   *
   * NOTE: This route is a placeholder for future webhook integration.
   * The actual webhook handling should be done by the TelegramBotService
   * which is initialized in the MCP server, not the API server.
   */
  router.post("/webhook", async (c) => {
    // In production, this would forward the update to the TelegramBotService
    // For now, return 200 OK to acknowledge receipt
    return c.json({ ok: true });
  });

  /**
   * GET /link/:email
   *
   * Generate a deep link to the AgentPass Telegram bot with pre-filled email.
   * This allows users to easily link their account from the dashboard.
   *
   * Example: GET /telegram/link/user@example.com
   * Returns: { link: "https://t.me/AgentPass_bot?start=link_user@example.com" }
   */
  router.get("/link/:email", (c) => {
    const email = c.req.param("email");

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json(
        { error: "Invalid email format", code: "INVALID_EMAIL" },
        400,
      );
    }

    // Generate deep link to the bot
    // The bot username should come from env var in production
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || "AgentPass_bot";
    const deepLink = `https://t.me/${botUsername}?start=link_${encodeURIComponent(email)}`;

    return c.json({
      email,
      link: deepLink,
      instructions:
        "Click the link to open Telegram and link your account to receive notifications from your AI agents.",
    });
  });

  /**
   * GET /status
   *
   * Check if Telegram notifications are enabled.
   * Returns the bot username and whether the bot is running.
   */
  router.get("/status", (c) => {
    const enabled = !!process.env.TELEGRAM_BOT_TOKEN;
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || "AgentPass_bot";

    return c.json({
      enabled,
      bot_username: enabled ? botUsername : undefined,
      message: enabled
        ? "Telegram notifications are enabled"
        : "Telegram notifications are disabled (TELEGRAM_BOT_TOKEN not set)",
    });
  });

  return router;
}
