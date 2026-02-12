import { describe, it, expect, beforeEach, vi } from "vitest";
import { TelegramBotService } from "./telegram-bot.js";
import type { ApprovalService } from "./approval-service.js";

describe("TelegramBotService", () => {
  let service: TelegramBotService;

  beforeEach(() => {
    service = new TelegramBotService();
  });

  describe("initialization", () => {
    it("should initialize without crashing when TELEGRAM_BOT_TOKEN is not set", () => {
      expect(service.isEnabled()).toBe(false);
    });

    it("should be disabled when no token is provided", () => {
      const bot = new TelegramBotService({});
      expect(bot.isEnabled()).toBe(false);
    });
  });

  describe("setChatId and getChatId", () => {
    it("should store and retrieve a chat ID", () => {
      service.setChatId("user@example.com", "chat_12345");
      expect(service.getChatId("user@example.com")).toBe("chat_12345");
    });

    it("should return undefined for unregistered owner", () => {
      expect(service.getChatId("unknown@example.com")).toBeUndefined();
    });

    it("should overwrite existing chat ID", () => {
      service.setChatId("user@example.com", "chat_12345");
      service.setChatId("user@example.com", "chat_67890");
      expect(service.getChatId("user@example.com")).toBe("chat_67890");
    });
  });

  describe("notifyApprovalNeeded", () => {
    it("should store notification when chat ID is registered", async () => {
      service.setChatId("owner@example.com", "chat_12345");

      await service.notifyApprovalNeeded(
        "owner@example.com",
        "TestAgent",
        "ap_test123",
        "register",
        { service: "github.com", domain: "github.com" },
      );

      const notifications = service.getNotifications("owner@example.com");
      expect(notifications).toHaveLength(1);
      expect(notifications[0]!.type).toBe("approval_request");
      expect(notifications[0]!.message).toContain("TestAgent");
      expect(notifications[0]!.message).toContain("ap_test123");
      expect(notifications[0]!.inline_buttons).toHaveLength(2);
    });

    it("should log warning when chat ID is not registered", async () => {
      const consoleSpy = vi.spyOn(console, "warn");

      await service.notifyApprovalNeeded(
        "unknown@example.com",
        "TestAgent",
        "ap_test123",
        "register",
        { service: "github.com" },
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("No chat ID registered"),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("notifyCaptchaDetected", () => {
    it("should store notification with CAPTCHA details", async () => {
      service.setChatId("owner@example.com", "chat_12345");

      await service.notifyCaptchaDetected(
        "owner@example.com",
        "TestAgent",
        "ap_test123",
        "github.com",
        "reCAPTCHA v2",
      );

      const notifications = service.getNotifications("owner@example.com");
      expect(notifications).toHaveLength(1);
      expect(notifications[0]!.type).toBe("captcha_screenshot");
      expect(notifications[0]!.message).toContain("reCAPTCHA v2");
      expect(notifications[0]!.message).toContain("github.com");
    });

    it("should handle screenshot buffer gracefully", async () => {
      service.setChatId("owner@example.com", "chat_12345");

      const screenshot = Buffer.from("fake-image-data");

      await service.notifyCaptchaDetected(
        "owner@example.com",
        "TestAgent",
        "ap_test123",
        "github.com",
        "hCaptcha",
        screenshot,
      );

      const notifications = service.getNotifications("owner@example.com");
      expect(notifications).toHaveLength(1);
    });
  });

  describe("notifyError", () => {
    it("should store error notification with retry/skip buttons", async () => {
      service.setChatId("owner@example.com", "chat_12345");

      await service.notifyError(
        "owner@example.com",
        "TestAgent",
        "ap_test123",
        "github.com",
        "Login failed: invalid credentials",
      );

      const notifications = service.getNotifications("owner@example.com");
      expect(notifications).toHaveLength(1);
      expect(notifications[0]!.type).toBe("error_notification");
      expect(notifications[0]!.message).toContain("invalid credentials");
      expect(notifications[0]!.inline_buttons).toHaveLength(2);
      expect(notifications[0]!.inline_buttons![0]!.text).toBe("🔄 Retry");
      expect(notifications[0]!.inline_buttons![1]!.text).toBe("⏭ Skip");
    });
  });

  describe("notifyRegistration", () => {
    it("should store registration success notification", async () => {
      service.setChatId("owner@example.com", "chat_12345");

      await service.notifyRegistration(
        "owner@example.com",
        "TestAgent",
        "ap_test123",
        "github.com",
        "native",
        45.2,
      );

      const notifications = service.getNotifications("owner@example.com");
      expect(notifications).toHaveLength(1);
      expect(notifications[0]!.type).toBe("registration_success");
      expect(notifications[0]!.message).toContain("github.com");
      expect(notifications[0]!.message).toContain("Native");
      expect(notifications[0]!.message).toContain("45.2s");
    });

    it("should handle fallback registration", async () => {
      service.setChatId("owner@example.com", "chat_12345");

      await service.notifyRegistration(
        "owner@example.com",
        "TestAgent",
        "ap_test123",
        "twitter.com",
        "fallback",
      );

      const notifications = service.getNotifications("owner@example.com");
      expect(notifications[0]!.message).toContain("Fallback");
      expect(notifications[0]!.message).toContain("browser automation");
    });
  });

  describe("notifyLogin", () => {
    it("should store login success notification", async () => {
      service.setChatId("owner@example.com", "chat_12345");

      await service.notifyLogin(
        "owner@example.com",
        "TestAgent",
        "ap_test123",
        "github.com",
      );

      const notifications = service.getNotifications("owner@example.com");
      expect(notifications).toHaveLength(1);
      expect(notifications[0]!.type).toBe("login_success");
      expect(notifications[0]!.message).toContain("Login Success");
      expect(notifications[0]!.message).toContain("github.com");
    });
  });

  describe("backward compatibility methods", () => {
    it("sendApprovalRequest should work as before", () => {
      service.setChatId("owner-001", "chat_12345");

      const notification = service.sendApprovalRequest(
        "owner-001",
        "web-scraper",
        "register",
        "Register on GitHub",
      );

      expect(notification.type).toBe("approval_request");
      expect(notification.message).toContain("web-scraper");
      expect(notification.inline_buttons).toHaveLength(2);
    });

    it("sendCaptchaScreenshot should work as before", () => {
      service.setChatId("owner-001", "chat_12345");

      const notification = service.sendCaptchaScreenshot(
        "owner-001",
        "data-collector",
        "reCAPTCHA",
        "https://screenshots.example.com/captcha.png",
      );

      expect(notification.type).toBe("captcha_screenshot");
      expect(notification.image_url).toBe(
        "https://screenshots.example.com/captcha.png",
      );
    });

    it("sendErrorNotification should work as before", () => {
      service.setChatId("owner-001", "chat_12345");

      const notification = service.sendErrorNotification(
        "owner-001",
        "research-bot",
        "Login failed",
        ["Retry", "Skip"],
      );

      expect(notification.type).toBe("error_notification");
      expect(notification.inline_buttons).toHaveLength(2);
    });

    it("sendActivityDigest should work as before", () => {
      service.setChatId("owner-001", "chat_12345");

      const notification = service.sendActivityDigest(
        "owner-001",
        "3 agents active, 12 registrations",
      );

      expect(notification.type).toBe("activity_digest");
      expect(notification.message).toContain("3 agents active");
    });
  });

  describe("handleCallback", () => {
    it("should process valid callback response", () => {
      service.setChatId("owner@example.com", "chat_12345");

      const notification = service.sendApprovalRequest(
        "owner@example.com",
        "TestAgent",
        "register",
        "Register on GitHub",
      );

      const approveData = notification.inline_buttons![0]!.callback_data;
      const parts = approveData.split("_");
      const notificationId = parts.slice(1).join("_");

      const response = service.handleCallback(notificationId, approveData);

      expect(response).toBeDefined();
      expect(response!.callback_data).toBe(approveData);
    });

    it("should return undefined for unknown notification ID", () => {
      const response = service.handleCallback("nonexistent", "approve_xxx");
      expect(response).toBeUndefined();
    });
  });

  describe("webhook helpers", () => {
    it("should generate webhook URL", () => {
      const url = service.getWebhookUrl("api.agentpass.space");
      expect(url).toBe("https://api.agentpass.space/telegram/webhook");
    });
  });

  describe("graceful shutdown", () => {
    it("should stop without errors when disabled", async () => {
      await expect(service.stop()).resolves.toBeUndefined();
    });
  });
});
