import { describe, it, expect, beforeEach } from "vitest";
import { CredentialService } from "../services/credential-service.js";

describe("CredentialService", () => {
  let service: CredentialService;

  beforeEach(() => {
    service = new CredentialService();
  });

  const PASSPORT_ID = "ap_aabbccddeeff";

  describe("storeCredential", () => {
    it("should store and return a credential", async () => {
      const cred = await service.storeCredential({
        passport_id: PASSPORT_ID,
        service: "github",
        username: "agent-bot",
        password: "s3cret",
        email: "agent@example.com",
      });

      expect(cred.service).toBe("github");
      expect(cred.username).toBe("agent-bot");
      expect(cred.password).toBe("s3cret");
      expect(cred.email).toBe("agent@example.com");
      expect(cred.stored_at).toBeTruthy();
    });

    it("should overwrite existing credential for same service", async () => {
      await service.storeCredential({
        passport_id: PASSPORT_ID,
        service: "github",
        username: "old-user",
        password: "old-pass",
        email: "old@example.com",
      });

      await service.storeCredential({
        passport_id: PASSPORT_ID,
        service: "github",
        username: "new-user",
        password: "new-pass",
        email: "new@example.com",
      });

      const cred = await service.getCredential(PASSPORT_ID, "github");
      expect(cred?.username).toBe("new-user");
      expect(cred?.password).toBe("new-pass");
    });
  });

  describe("getCredential", () => {
    it("should return stored credential", async () => {
      await service.storeCredential({
        passport_id: PASSPORT_ID,
        service: "slack",
        username: "bot",
        password: "token123",
        email: "bot@example.com",
      });

      const cred = await service.getCredential(PASSPORT_ID, "slack");
      expect(cred).toBeDefined();
      expect(cred!.service).toBe("slack");
      expect(cred!.username).toBe("bot");
    });

    it("should return null for non-existent service", async () => {
      const cred = await service.getCredential(PASSPORT_ID, "nonexistent");
      expect(cred).toBeNull();
    });

    it("should return null for non-existent passport", async () => {
      const cred = await service.getCredential("ap_000000000000", "github");
      expect(cred).toBeNull();
    });
  });

  describe("listCredentials", () => {
    it("should return empty array for unknown passport", async () => {
      const list = await service.listCredentials("ap_000000000000");
      expect(list).toEqual([]);
    });

    it("should return summaries without passwords", async () => {
      await service.storeCredential({
        passport_id: PASSPORT_ID,
        service: "github",
        username: "agent",
        password: "secret",
        email: "a@example.com",
      });
      await service.storeCredential({
        passport_id: PASSPORT_ID,
        service: "slack",
        username: "bot",
        password: "token",
        email: "b@example.com",
      });

      const list = await service.listCredentials(PASSPORT_ID);
      expect(list).toHaveLength(2);

      for (const item of list) {
        expect(item).not.toHaveProperty("password");
        expect(item.service).toBeTruthy();
        expect(item.username).toBeTruthy();
        expect(item.email).toBeTruthy();
        expect(item.stored_at).toBeTruthy();
      }
    });
  });

  describe("deleteCredential", () => {
    it("should remove an existing credential", async () => {
      await service.storeCredential({
        passport_id: PASSPORT_ID,
        service: "github",
        username: "agent",
        password: "secret",
        email: "a@example.com",
      });

      const deleted = await service.deleteCredential(PASSPORT_ID, "github");
      expect(deleted).toBe(true);

      const cred = await service.getCredential(PASSPORT_ID, "github");
      expect(cred).toBeNull();
    });

    it("should return false for non-existent credential", async () => {
      const deleted = await service.deleteCredential(PASSPORT_ID, "nonexistent");
      expect(deleted).toBe(false);
    });
  });
});
