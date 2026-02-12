import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { createTelegramRouter } from "./telegram.js";

describe("Telegram Routes", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    const telegramRouter = createTelegramRouter();
    app.route("/telegram", telegramRouter);
  });

  describe("POST /telegram/webhook", () => {
    it("should accept webhook updates", async () => {
      const res = await app.request("/telegram/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          update_id: 12345,
          message: {
            message_id: 1,
            from: { id: 123, first_name: "Test" },
            chat: { id: 123, type: "private" },
            date: Date.now(),
            text: "/start",
          },
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ ok: true });
    });
  });

  describe("GET /telegram/link/:email", () => {
    it("should generate deep link for valid email", async () => {
      const res = await app.request("/telegram/link/user@example.com");

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("email", "user@example.com");
      expect(json).toHaveProperty("link");
      expect(json.link).toContain("t.me/");
      // Email should be URL-encoded in the deep link
      expect(json.link).toContain("start=link_");
      expect(json.link).toContain(encodeURIComponent("user@example.com"));
      expect(json).toHaveProperty("instructions");
    });

    it("should reject invalid email format", async () => {
      const res = await app.request("/telegram/link/invalid-email");

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json).toHaveProperty("error", "Invalid email format");
      expect(json).toHaveProperty("code", "INVALID_EMAIL");
    });

    it("should URL-encode email in deep link", async () => {
      const res = await app.request("/telegram/link/user+test@example.com");

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.link).toContain(encodeURIComponent("user+test@example.com"));
    });
  });

  describe("GET /telegram/status", () => {
    it("should return status when bot is disabled", async () => {
      // Ensure TELEGRAM_BOT_TOKEN is not set for this test
      delete process.env.TELEGRAM_BOT_TOKEN;

      const res = await app.request("/telegram/status");

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("enabled", false);
      expect(json).toHaveProperty("message");
      expect(json.message).toContain("disabled");
    });

    it("should return bot username when enabled", async () => {
      // Temporarily set token for this test
      const originalToken = process.env.TELEGRAM_BOT_TOKEN;
      process.env.TELEGRAM_BOT_TOKEN = "test_token";

      const res = await app.request("/telegram/status");

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("enabled", true);
      expect(json).toHaveProperty("bot_username");

      // Restore original token
      if (originalToken) {
        process.env.TELEGRAM_BOT_TOKEN = originalToken;
      } else {
        delete process.env.TELEGRAM_BOT_TOKEN;
      }
    });
  });
});
