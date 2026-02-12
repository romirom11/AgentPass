import { describe, it, expect, beforeEach } from "vitest";
import { TelegramService } from "./telegram-service.js";

describe("TelegramService", () => {
  let service: TelegramService;

  beforeEach(() => {
    service = new TelegramService();
  });

  describe("setChatId and getChatId", () => {
    it("should store and retrieve a chat ID", () => {
      service.setChatId("owner-001", "chat_12345");
      expect(service.getChatId("owner-001")).toBe("chat_12345");
    });

    it("should return undefined for unregistered owner", () => {
      expect(service.getChatId("unknown-owner")).toBeUndefined();
    });

    it("should overwrite existing chat ID", () => {
      service.setChatId("owner-001", "chat_12345");
      service.setChatId("owner-001", "chat_67890");
      expect(service.getChatId("owner-001")).toBe("chat_67890");
    });
  });

  describe("sendApprovalRequest", () => {
    it("should create a notification with Approve and Deny buttons", () => {
      service.setChatId("owner-001", "chat_12345");

      const notification = service.sendApprovalRequest(
        "owner-001",
        "web-scraper-01",
        "register",
        "Register on GitHub",
      );

      expect(notification.type).toBe("approval_request");
      expect(notification.chat_id).toBe("chat_12345");
      expect(notification.message).toContain("web-scraper-01");
      expect(notification.message).toContain("register");
      expect(notification.message).toContain("Register on GitHub");
      expect(notification.inline_buttons).toHaveLength(2);
      expect(notification.inline_buttons![0]!.text).toBe("Approve");
      expect(notification.inline_buttons![1]!.text).toBe("Deny");
      expect(notification.sent_at).toBeTruthy();
    });

    it("should throw if no chat ID is registered", () => {
      expect(() =>
        service.sendApprovalRequest(
          "unknown-owner",
          "agent",
          "action",
          "details",
        ),
      ).toThrow("No Telegram chat ID registered");
    });
  });

  describe("sendCaptchaScreenshot", () => {
    it("should create notification with image URL", () => {
      service.setChatId("owner-001", "chat_12345");

      const notification = service.sendCaptchaScreenshot(
        "owner-001",
        "data-collector",
        "reCAPTCHA",
        "https://api.agentpass.space/captcha/abc123.png",
      );

      expect(notification.type).toBe("captcha_screenshot");
      expect(notification.image_url).toBe(
        "https://api.agentpass.space/captcha/abc123.png",
      );
      expect(notification.message).toContain("data-collector");
      expect(notification.message).toContain("reCAPTCHA");
      expect(notification.inline_buttons).toHaveLength(2);
      expect(notification.inline_buttons![0]!.text).toBe("Open Solver");
      expect(notification.inline_buttons![1]!.text).toBe("Skip");
    });

    it("should throw if no chat ID is registered", () => {
      expect(() =>
        service.sendCaptchaScreenshot(
          "unknown",
          "agent",
          "type",
          "url",
        ),
      ).toThrow("No Telegram chat ID registered");
    });
  });

  describe("sendErrorNotification", () => {
    it("should create notification with action buttons", () => {
      service.setChatId("owner-001", "chat_12345");

      const notification = service.sendErrorNotification(
        "owner-001",
        "research-bot",
        "Login failed: invalid credentials",
        ["Retry", "Skip"],
      );

      expect(notification.type).toBe("error_notification");
      expect(notification.message).toContain("research-bot");
      expect(notification.message).toContain(
        "Login failed: invalid credentials",
      );
      expect(notification.inline_buttons).toHaveLength(2);
      expect(notification.inline_buttons![0]!.text).toBe("Retry");
      expect(notification.inline_buttons![1]!.text).toBe("Skip");
    });

    it("should generate callback_data from action text", () => {
      service.setChatId("owner-001", "chat_12345");

      const notification = service.sendErrorNotification(
        "owner-001",
        "agent",
        "Error message",
        ["Retry Login"],
      );

      expect(notification.inline_buttons![0]!.callback_data).toContain(
        "retry_login_",
      );
    });

    it("should throw if no chat ID is registered", () => {
      expect(() =>
        service.sendErrorNotification(
          "unknown",
          "agent",
          "error",
          ["Retry"],
        ),
      ).toThrow("No Telegram chat ID registered");
    });
  });

  describe("sendActivityDigest", () => {
    it("should create a digest notification without buttons", () => {
      service.setChatId("owner-001", "chat_12345");

      const notification = service.sendActivityDigest(
        "owner-001",
        "3 agents active, 12 registrations, 2 errors",
      );

      expect(notification.type).toBe("activity_digest");
      expect(notification.message).toContain("Daily Activity Digest");
      expect(notification.message).toContain("3 agents active");
      expect(notification.inline_buttons).toBeUndefined();
    });

    it("should throw if no chat ID is registered", () => {
      expect(() =>
        service.sendActivityDigest("unknown", "summary"),
      ).toThrow("No Telegram chat ID registered");
    });
  });

  describe("getNotifications", () => {
    it("should return all notifications for an owner", () => {
      service.setChatId("owner-001", "chat_12345");

      service.sendApprovalRequest(
        "owner-001",
        "agent-a",
        "register",
        "details",
      );
      service.sendErrorNotification(
        "owner-001",
        "agent-b",
        "error",
        ["Retry"],
      );
      service.sendActivityDigest("owner-001", "summary");

      const notifications = service.getNotifications("owner-001");
      expect(notifications).toHaveLength(3);
      expect(notifications[0]!.type).toBe("approval_request");
      expect(notifications[1]!.type).toBe("error_notification");
      expect(notifications[2]!.type).toBe("activity_digest");
    });

    it("should return empty array for owner with no notifications", () => {
      expect(service.getNotifications("nobody")).toEqual([]);
    });
  });

  describe("handleCallback", () => {
    it("should process a valid callback response", () => {
      service.setChatId("owner-001", "chat_12345");

      const notification = service.sendApprovalRequest(
        "owner-001",
        "agent",
        "register",
        "details",
      );

      const approveData = notification.inline_buttons![0]!.callback_data;
      // Extract the notification ID from the callback_data (format: approve_tg_N)
      // Split by '_' and join the parts after 'approve' to get 'tg_N'
      const parts = approveData.split("_");
      const notificationId = parts.slice(1).join("_");
      const response = service.handleCallback(notificationId, approveData);

      expect(response).toBeDefined();
      expect(response!.notification_id).toBe(notification.id);
      expect(response!.callback_data).toBe(approveData);
      expect(response!.responded_at).toBeTruthy();
    });

    it("should return undefined for unknown notification ID", () => {
      const response = service.handleCallback("nonexistent", "approve_xxx");
      expect(response).toBeUndefined();
    });

    it("should return undefined for invalid callback_data", () => {
      service.setChatId("owner-001", "chat_12345");

      const notification = service.sendApprovalRequest(
        "owner-001",
        "agent",
        "register",
        "details",
      );

      // Extract the notification ID from the first button's callback_data
      const parts = notification.inline_buttons![0]!.callback_data.split("_");
      const notificationId = parts.slice(1).join("_");
      const response = service.handleCallback(
        notificationId,
        "invalid_callback",
      );
      expect(response).toBeUndefined();
    });

    it("should store the callback response for later retrieval", () => {
      service.setChatId("owner-001", "chat_12345");

      const notification = service.sendApprovalRequest(
        "owner-001",
        "agent",
        "register",
        "details",
      );

      const denyData = notification.inline_buttons![1]!.callback_data;
      // Extract the notification ID from the callback_data (format: deny_tg_N)
      const parts = denyData.split("_");
      const notificationId = parts.slice(1).join("_");
      service.handleCallback(notificationId, denyData);

      const stored = service.getCallbackResponse(notificationId);
      expect(stored).toBeDefined();
      expect(stored!.callback_data).toBe(denyData);
    });
  });
});
