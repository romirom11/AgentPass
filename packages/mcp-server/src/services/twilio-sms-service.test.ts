import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { TwilioSmsService } from "./twilio-sms-service.js";
import type { SmsMessage } from "./sms-service-interface.js";

// Mock Twilio client
vi.mock("twilio", () => {
  return {
    default: vi.fn(() => ({
      availablePhoneNumbers: vi.fn(() => ({
        local: {
          list: vi.fn(async () => [
            { phoneNumber: "+15551234567" },
          ]),
        },
      })),
      incomingPhoneNumbers: {
        create: vi.fn(async ({ phoneNumber }) => ({
          phoneNumber,
          sid: "PN" + Math.random().toString(36).substring(7),
        })),
      },
    })),
  };
});

describe("TwilioSmsService", () => {
  let service: TwilioSmsService;
  let mockPoller: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockPoller = vi.fn(async () => []);
    service = new TwilioSmsService(
      "AC_test_sid",
      "test_auth_token",
      "+15551111111,+15552222222",
      "http://localhost:3846",
      mockPoller,
    );
  });

  afterEach(() => {
    service.shutdown();
  });

  describe("constructor", () => {
    it("should initialize with phone number pool", () => {
      expect(service).toBeDefined();
    });

    it("should throw if no phone numbers provided", () => {
      expect(
        () =>
          new TwilioSmsService(
            "AC_test_sid",
            "test_auth_token",
            "",
            "http://localhost:3846",
          ),
      ).toThrow("No phone numbers configured");
    });
  });

  describe("getPhoneNumber", () => {
    it("should assign a number from the pool", async () => {
      const number = await service.getPhoneNumber("passport-001");
      expect(number).toMatch(/^\+1555\d{7}$/);
    });

    it("should return the same number for the same passport", async () => {
      const first = await service.getPhoneNumber("passport-001");
      const second = await service.getPhoneNumber("passport-001");
      expect(first).toBe(second);
    });

    it("should return different numbers for different passports", async () => {
      const a = await service.getPhoneNumber("passport-001");
      const b = await service.getPhoneNumber("passport-002");
      expect(a).not.toBe(b);
    });

    it("should provision a new number when pool is exhausted", async () => {
      // Exhaust the pool (2 numbers)
      await service.getPhoneNumber("passport-001");
      await service.getPhoneNumber("passport-002");

      // Third request should provision new number
      const third = await service.getPhoneNumber("passport-003");
      expect(third).toMatch(/^\+1555\d{7}$/);
    });
  });

  describe("releasePhoneNumber", () => {
    it("should release a number back to the pool", async () => {
      const number = await service.getPhoneNumber("passport-001");
      await service.releasePhoneNumber("passport-001");

      // Same number should be available for a different passport
      const number2 = await service.getPhoneNumber("passport-002");
      expect(number2).toBe(number);
    });

    it("should be a no-op if passport has no number", async () => {
      await expect(
        service.releasePhoneNumber("nonexistent"),
      ).resolves.toBeUndefined();
    });
  });

  describe("handleIncomingSms", () => {
    it("should store incoming SMS and notify waiters", async () => {
      const phoneNumber = await service.getPhoneNumber("passport-001");

      const sms: SmsMessage = {
        id: "sms-001",
        to: phoneNumber,
        from: "+12025551234",
        body: "Your code is 123456",
        received_at: new Date().toISOString(),
      };

      const promise = service.waitForSms(phoneNumber, undefined, 5000);

      // Simulate webhook delivery
      service.handleIncomingSms(sms);

      const received = await promise;
      expect(received.id).toBe("sms-001");
      expect(received.body).toBe("Your code is 123456");
    });

    it("should resolve immediately if SMS already received", async () => {
      const phoneNumber = await service.getPhoneNumber("passport-001");

      const sms: SmsMessage = {
        id: "sms-001",
        to: phoneNumber,
        from: "+12025551234",
        body: "Already here",
        received_at: new Date().toISOString(),
      };

      // Deliver SMS before waiting
      service.handleIncomingSms(sms);

      const received = await service.waitForSms(phoneNumber, undefined, 1000);
      expect(received.id).toBe("sms-001");
    });
  });

  describe("waitForSms", () => {
    it("should timeout if no SMS arrives", async () => {
      const phoneNumber = await service.getPhoneNumber("passport-001");

      await expect(
        service.waitForSms(phoneNumber, undefined, 200),
      ).rejects.toThrow("Timed out");
    });

    it("should filter SMS by sender", async () => {
      const phoneNumber = await service.getPhoneNumber("passport-001");

      const promise = service.waitForSms(
        phoneNumber,
        { from: "+15551234567" },
        5000,
      );

      // Send SMS from wrong sender
      service.handleIncomingSms({
        id: "sms-wrong",
        to: phoneNumber,
        from: "+15559999999",
        body: "Wrong sender",
        received_at: new Date().toISOString(),
      });

      // Send SMS from correct sender
      setTimeout(() => {
        service.handleIncomingSms({
          id: "sms-correct",
          to: phoneNumber,
          from: "+15551234567",
          body: "Correct sender",
          received_at: new Date().toISOString(),
        });
      }, 100);

      const received = await promise;
      expect(received.id).toBe("sms-correct");
    });

    it("should filter SMS by body content", async () => {
      const phoneNumber = await service.getPhoneNumber("passport-001");

      const promise = service.waitForSms(
        phoneNumber,
        { bodyContains: "verification" },
        5000,
      );

      // Send SMS without keyword
      service.handleIncomingSms({
        id: "sms-wrong",
        to: phoneNumber,
        from: "+15551234567",
        body: "Hello there",
        received_at: new Date().toISOString(),
      });

      // Send SMS with keyword
      setTimeout(() => {
        service.handleIncomingSms({
          id: "sms-correct",
          to: phoneNumber,
          from: "+15551234567",
          body: "Your verification code is 123456",
          received_at: new Date().toISOString(),
        });
      }, 100);

      const received = await promise;
      expect(received.id).toBe("sms-correct");
    });
  });

  describe("extractOtpFromSms", () => {
    it("should extract OTP from 'Your code is 123456' pattern", () => {
      expect(
        service.extractOtpFromSms("Your verification code is 123456"),
      ).toBe("123456");
    });

    it("should extract OTP from 'OTP: 7890' pattern", () => {
      expect(service.extractOtpFromSms("Your OTP: 7890")).toBe("7890");
    });

    it("should extract OTP from 'pin is 5678' pattern", () => {
      expect(service.extractOtpFromSms("Your pin is 5678")).toBe("5678");
    });

    it("should extract 4-digit code", () => {
      expect(service.extractOtpFromSms("Use code: 4321 to log in")).toBe(
        "4321",
      );
    });

    it("should extract 8-digit code", () => {
      expect(service.extractOtpFromSms("Your token is 12345678")).toBe(
        "12345678",
      );
    });

    it("should return null for messages with no OTP", () => {
      expect(
        service.extractOtpFromSms("Welcome to our service! Enjoy."),
      ).toBeNull();
    });
  });

  describe("polling", () => {
    it("should start polling when waiting for SMS", async () => {
      const phoneNumber = await service.getPhoneNumber("passport-001");

      const promise = service.waitForSms(phoneNumber, undefined, 1000);

      // Wait a bit for polling to start
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Poller should have been called at least once
      expect(mockPoller).toHaveBeenCalled();

      // Deliver SMS to resolve the promise
      service.handleIncomingSms({
        id: "sms-001",
        to: phoneNumber,
        from: "+15551234567",
        body: "Test",
        received_at: new Date().toISOString(),
      });

      await promise;
    });

    it("should stop polling after SMS is received", async () => {
      const phoneNumber = await service.getPhoneNumber("passport-001");

      const promise = service.waitForSms(phoneNumber, undefined, 5000);

      // Deliver SMS immediately
      service.handleIncomingSms({
        id: "sms-001",
        to: phoneNumber,
        from: "+15551234567",
        body: "Test",
        received_at: new Date().toISOString(),
      });

      await promise;

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 500));

      const callCount = mockPoller.mock.calls.length;

      // Wait more - polling should have stopped
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(mockPoller.mock.calls.length).toBe(callCount);
    }, 10000);
  });
});
