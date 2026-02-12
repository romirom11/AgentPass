import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomBytes } from "node:crypto";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import Database from "better-sqlite3";
import { CredentialVault } from "./vault.js";

/**
 * Generate a fake base64url-encoded Ed25519 private key (48 random bytes).
 * Real PKCS8-encoded Ed25519 keys are longer, but HKDF accepts arbitrary
 * length input material so random bytes are fine for testing key derivation.
 */
function randomPrivateKey(): string {
  return randomBytes(48).toString("base64url");
}

/** Create a unique temporary database path. */
function tmpDbPath(): string {
  const name = `agentpass-vault-test-${Date.now()}-${randomBytes(4).toString("hex")}.db`;
  return path.join(os.tmpdir(), name);
}

describe("CredentialVault", () => {
  let vault: CredentialVault;
  let dbPath: string;
  let privateKey: string;

  beforeEach(async () => {
    dbPath = tmpDbPath();
    privateKey = randomPrivateKey();
    vault = new CredentialVault(dbPath, privateKey);
    await vault.init();
  });

  afterEach(() => {
    vault.close();
    // Clean up temp files
    try {
      fs.unlinkSync(dbPath);
    } catch {
      // Ignore if already removed
    }
    try {
      fs.unlinkSync(dbPath + "-wal");
    } catch {
      // WAL file may or may not exist
    }
    try {
      fs.unlinkSync(dbPath + "-shm");
    } catch {
      // SHM file may or may not exist
    }
  });

  it("should store and retrieve a credential", async () => {
    await vault.store({
      service: "github.com",
      username: "agent-bot",
      password: "sup3r-s3cret",
      email: "bot@example.com",
    });

    const cred = await vault.get("github.com");

    expect(cred).not.toBeNull();
    expect(cred!.service).toBe("github.com");
    expect(cred!.username).toBe("agent-bot");
    expect(cred!.password).toBe("sup3r-s3cret");
    expect(cred!.email).toBe("bot@example.com");
    expect(cred!.registered_at).toBeDefined();
    // registered_at should be a valid ISO date
    expect(new Date(cred!.registered_at).toISOString()).toBe(
      cred!.registered_at,
    );
  });

  it("should list credentials without exposing passwords", async () => {
    await vault.store({
      service: "github.com",
      username: "agent-bot",
      password: "secret-1",
      email: "bot@gh.com",
    });

    await vault.store({
      service: "npmjs.com",
      username: "npm-bot",
      password: "secret-2",
      email: "bot@npm.com",
    });

    const list = await vault.list();

    expect(list).toHaveLength(2);

    // Entries are ordered by service name
    expect(list[0]!.service).toBe("github.com");
    expect(list[1]!.service).toBe("npmjs.com");

    // Each entry has the expected fields
    for (const entry of list) {
      expect(entry).toHaveProperty("service");
      expect(entry).toHaveProperty("username");
      expect(entry).toHaveProperty("email");
      expect(entry).toHaveProperty("registered_at");
    }

    // Password and cookies must NOT appear in the listing
    for (const entry of list) {
      expect(entry).not.toHaveProperty("password");
      expect(entry).not.toHaveProperty("cookies");
    }
  });

  it("should delete a credential", async () => {
    await vault.store({
      service: "github.com",
      username: "agent-bot",
      password: "secret",
      email: "bot@gh.com",
    });

    expect(await vault.has("github.com")).toBe(true);

    const deleted = await vault.delete("github.com");
    expect(deleted).toBe(true);

    expect(await vault.has("github.com")).toBe(false);
    expect(await vault.get("github.com")).toBeNull();
  });

  it("should return false when deleting a non-existent credential", async () => {
    const deleted = await vault.delete("no-such-service.com");
    expect(deleted).toBe(false);
  });

  it("should report has() correctly", async () => {
    expect(await vault.has("github.com")).toBe(false);

    await vault.store({
      service: "github.com",
      username: "agent-bot",
      password: "secret",
      email: "bot@gh.com",
    });

    expect(await vault.has("github.com")).toBe(true);
    expect(await vault.has("other.com")).toBe(false);
  });

  it("should return null for a non-existent service", async () => {
    const cred = await vault.get("does-not-exist.com");
    expect(cred).toBeNull();
  });

  it("should update a credential when storing the same service twice", async () => {
    await vault.store({
      service: "github.com",
      username: "old-user",
      password: "old-pass",
      email: "old@gh.com",
    });

    await vault.store({
      service: "github.com",
      username: "new-user",
      password: "new-pass",
      email: "new@gh.com",
    });

    const cred = await vault.get("github.com");

    expect(cred).not.toBeNull();
    expect(cred!.username).toBe("new-user");
    expect(cred!.password).toBe("new-pass");
    expect(cred!.email).toBe("new@gh.com");

    // Only one row for this service
    const list = await vault.list();
    expect(list).toHaveLength(1);
  });

  it("should store optional cookies field", async () => {
    const cookies = JSON.stringify([
      { name: "session", value: "abc123", domain: ".github.com" },
    ]);

    await vault.store({
      service: "github.com",
      username: "agent-bot",
      password: "secret",
      email: "bot@gh.com",
      cookies,
    });

    const cred = await vault.get("github.com");

    expect(cred).not.toBeNull();
    expect(cred!.cookies).toBe(cookies);
  });

  it("should store data encrypted in the database (raw data is not plaintext)", async () => {
    const password = "my-super-secret-password-12345";

    await vault.store({
      service: "github.com",
      username: "agent-bot",
      password,
      email: "bot@gh.com",
    });

    // Read the raw encrypted_data directly from SQLite
    const rawDb = vault._db!;
    const row = rawDb
      .prepare("SELECT encrypted_data FROM credentials WHERE service = ?")
      .get("github.com") as { encrypted_data: string };

    expect(row).toBeDefined();

    // The raw value must NOT contain the plaintext password
    expect(row.encrypted_data).not.toContain(password);
    expect(row.encrypted_data).not.toContain("agent-bot");
    expect(row.encrypted_data).not.toContain("bot@gh.com");

    // It should look like a base64url string (the encrypted blob)
    expect(row.encrypted_data).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("should not allow decryption with a different private key", async () => {
    const password = "cross-key-test-secret";

    await vault.store({
      service: "github.com",
      username: "agent-bot",
      password,
      email: "bot@gh.com",
    });

    vault.close();

    // Open the same database with a different private key
    const otherKey = randomPrivateKey();
    const otherVault = new CredentialVault(dbPath, otherKey);
    await otherVault.init();

    try {
      // Attempting to decrypt data encrypted with a different key should throw
      await expect(otherVault.get("github.com")).rejects.toThrow();
    } finally {
      otherVault.close();
    }
  });

  it("should throw if methods are called before init()", async () => {
    const uninitVault = new CredentialVault(tmpDbPath(), randomPrivateKey());

    await expect(
      uninitVault.store({
        service: "test.com",
        username: "u",
        password: "p",
        email: "e@e.com",
      }),
    ).rejects.toThrow(/not initialized/i);

    await expect(uninitVault.get("test.com")).rejects.toThrow(
      /not initialized/i,
    );

    await expect(uninitVault.list()).rejects.toThrow(/not initialized/i);

    await expect(uninitVault.delete("test.com")).rejects.toThrow(
      /not initialized/i,
    );

    await expect(uninitVault.has("test.com")).rejects.toThrow(
      /not initialized/i,
    );
  });

  it("should handle an empty vault for list()", async () => {
    const list = await vault.list();
    expect(list).toEqual([]);
  });

  it("should close cleanly and reject subsequent operations", async () => {
    vault.close();

    await expect(vault.get("test.com")).rejects.toThrow(/not initialized/i);
  });
});

describe("CredentialVault - Identity Storage", () => {
  let vault: CredentialVault;
  let dbPath: string;
  let privateKey: string;

  beforeEach(async () => {
    dbPath = tmpDbPath();
    privateKey = randomPrivateKey();
    vault = new CredentialVault(dbPath, privateKey);
    await vault.init();
  });

  afterEach(() => {
    vault.close();
    // Clean up temp files
    try {
      fs.unlinkSync(dbPath);
    } catch {
      // Ignore if already removed
    }
    try {
      fs.unlinkSync(dbPath + "-wal");
    } catch {
      // WAL file may or may not exist
    }
    try {
      fs.unlinkSync(dbPath + "-shm");
    } catch {
      // SHM file may or may not exist
    }
  });

  it("should store and retrieve an identity", async () => {
    const testIdentity = {
      passport: {
        passport_id: "ap_test123456",
        version: "1.0",
        identity: {
          name: "test-agent",
          description: "Test agent",
          public_key: "test-public-key",
          created_at: new Date().toISOString(),
        },
        owner: {
          id: "owner-1",
          email: "owner@example.com",
          verified: true,
        },
        capabilities: {},
        trust: {
          score: 50,
          level: "basic" as const,
          factors: {
            owner_verified: true,
            email_verified: false,
            age_days: 0,
            successful_auths: 0,
            abuse_reports: 0,
          },
        },
        credentials_vault: {
          services_count: 0,
          encrypted: true,
          encryption: "AES-256-GCM",
        },
        permissions: {
          max_registrations_per_day: 10,
          allowed_domains: [],
          blocked_domains: [],
          requires_owner_approval: [],
          auto_approved: [],
        },
        audit: {
          total_actions: 0,
          last_action: new Date().toISOString(),
          log_retention_days: 90,
        },
      },
      privateKey: "test-private-key",
      status: "active" as const,
    };

    await vault.storeIdentity(testIdentity);

    const retrieved = await vault.getIdentity("ap_test123456");

    expect(retrieved).not.toBeNull();
    expect(retrieved!.passport.passport_id).toBe("ap_test123456");
    expect(retrieved!.passport.identity.name).toBe("test-agent");
    expect(retrieved!.privateKey).toBe("test-private-key");
    expect(retrieved!.status).toBe("active");
  });

  it("should list identities without exposing private keys", async () => {
    const identity1 = {
      passport: {
        passport_id: "ap_identity001",
        version: "1.0",
        identity: {
          name: "agent-1",
          description: "First agent",
          public_key: "pub-key-1",
          created_at: "2025-01-01T00:00:00.000Z",
        },
        owner: { id: "owner-1", email: "owner@example.com", verified: true },
        capabilities: {},
        trust: {
          score: 50,
          level: "basic" as const,
          factors: {
            owner_verified: true,
            email_verified: false,
            age_days: 0,
            successful_auths: 0,
            abuse_reports: 0,
          },
        },
        credentials_vault: {
          services_count: 0,
          encrypted: true,
          encryption: "AES-256-GCM",
        },
        permissions: {
          max_registrations_per_day: 10,
          allowed_domains: [],
          blocked_domains: [],
          requires_owner_approval: [],
          auto_approved: [],
        },
        audit: {
          total_actions: 0,
          last_action: "2025-01-01T00:00:00.000Z",
          log_retention_days: 90,
        },
      },
      privateKey: "private-key-1",
      status: "active" as const,
    };

    const identity2 = {
      passport: {
        passport_id: "ap_identity002",
        version: "1.0",
        identity: {
          name: "agent-2",
          description: "Second agent",
          public_key: "pub-key-2",
          created_at: "2025-01-02T00:00:00.000Z",
        },
        owner: { id: "owner-2", email: "owner2@example.com", verified: false },
        capabilities: {},
        trust: {
          score: 30,
          level: "unverified" as const,
          factors: {
            owner_verified: false,
            email_verified: false,
            age_days: 0,
            successful_auths: 0,
            abuse_reports: 0,
          },
        },
        credentials_vault: {
          services_count: 0,
          encrypted: true,
          encryption: "AES-256-GCM",
        },
        permissions: {
          max_registrations_per_day: 5,
          allowed_domains: [],
          blocked_domains: [],
          requires_owner_approval: [],
          auto_approved: [],
        },
        audit: {
          total_actions: 0,
          last_action: "2025-01-02T00:00:00.000Z",
          log_retention_days: 90,
        },
      },
      privateKey: "private-key-2",
      status: "revoked" as const,
    };

    await vault.storeIdentity(identity1);
    await vault.storeIdentity(identity2);

    const list = await vault.listIdentities();

    expect(list).toHaveLength(2);

    // Entries are ordered by passport_id
    expect(list[0]!.passport_id).toBe("ap_identity001");
    expect(list[1]!.passport_id).toBe("ap_identity002");

    // Each entry has the expected fields
    for (const entry of list) {
      expect(entry).toHaveProperty("passport_id");
      expect(entry).toHaveProperty("name");
      expect(entry).toHaveProperty("status");
      expect(entry).toHaveProperty("created_at");
    }

    // Private keys must NOT appear in the listing
    for (const entry of list) {
      expect(entry).not.toHaveProperty("privateKey");
    }
  });

  it("should delete an identity", async () => {
    const testIdentity = {
      passport: {
        passport_id: "ap_toDelete12",
        version: "1.0",
        identity: {
          name: "deletable-agent",
          description: "Will be deleted",
          public_key: "pub-key",
          created_at: new Date().toISOString(),
        },
        owner: { id: "owner-1", email: "owner@example.com", verified: true },
        capabilities: {},
        trust: {
          score: 50,
          level: "basic" as const,
          factors: {
            owner_verified: true,
            email_verified: false,
            age_days: 0,
            successful_auths: 0,
            abuse_reports: 0,
          },
        },
        credentials_vault: {
          services_count: 0,
          encrypted: true,
          encryption: "AES-256-GCM",
        },
        permissions: {
          max_registrations_per_day: 10,
          allowed_domains: [],
          blocked_domains: [],
          requires_owner_approval: [],
          auto_approved: [],
        },
        audit: {
          total_actions: 0,
          last_action: new Date().toISOString(),
          log_retention_days: 90,
        },
      },
      privateKey: "private-key",
      status: "active" as const,
    };

    await vault.storeIdentity(testIdentity);

    expect(await vault.hasIdentity("ap_toDelete12")).toBe(true);

    const deleted = await vault.deleteIdentity("ap_toDelete12");
    expect(deleted).toBe(true);

    expect(await vault.hasIdentity("ap_toDelete12")).toBe(false);
    expect(await vault.getIdentity("ap_toDelete12")).toBeNull();
  });

  it("should return false when deleting a non-existent identity", async () => {
    const deleted = await vault.deleteIdentity("ap_nonexistent");
    expect(deleted).toBe(false);
  });

  it("should report hasIdentity() correctly", async () => {
    expect(await vault.hasIdentity("ap_test123456")).toBe(false);

    const testIdentity = {
      passport: {
        passport_id: "ap_test123456",
        version: "1.0",
        identity: {
          name: "test-agent",
          description: "Test",
          public_key: "pub-key",
          created_at: new Date().toISOString(),
        },
        owner: { id: "owner-1", email: "owner@example.com", verified: true },
        capabilities: {},
        trust: {
          score: 50,
          level: "basic" as const,
          factors: {
            owner_verified: true,
            email_verified: false,
            age_days: 0,
            successful_auths: 0,
            abuse_reports: 0,
          },
        },
        credentials_vault: {
          services_count: 0,
          encrypted: true,
          encryption: "AES-256-GCM",
        },
        permissions: {
          max_registrations_per_day: 10,
          allowed_domains: [],
          blocked_domains: [],
          requires_owner_approval: [],
          auto_approved: [],
        },
        audit: {
          total_actions: 0,
          last_action: new Date().toISOString(),
          log_retention_days: 90,
        },
      },
      privateKey: "private-key",
      status: "active" as const,
    };

    await vault.storeIdentity(testIdentity);

    expect(await vault.hasIdentity("ap_test123456")).toBe(true);
    expect(await vault.hasIdentity("ap_other123456")).toBe(false);
  });

  it("should return null for a non-existent identity", async () => {
    const identity = await vault.getIdentity("ap_notfound123");
    expect(identity).toBeNull();
  });

  it("should update an identity when storing the same passport_id twice", async () => {
    const identity1 = {
      passport: {
        passport_id: "ap_update1234",
        version: "1.0",
        identity: {
          name: "old-name",
          description: "Old description",
          public_key: "pub-key",
          created_at: "2025-01-01T00:00:00.000Z",
        },
        owner: { id: "owner-1", email: "old@example.com", verified: false },
        capabilities: {},
        trust: {
          score: 30,
          level: "unverified" as const,
          factors: {
            owner_verified: false,
            email_verified: false,
            age_days: 0,
            successful_auths: 0,
            abuse_reports: 0,
          },
        },
        credentials_vault: {
          services_count: 0,
          encrypted: true,
          encryption: "AES-256-GCM",
        },
        permissions: {
          max_registrations_per_day: 10,
          allowed_domains: [],
          blocked_domains: [],
          requires_owner_approval: [],
          auto_approved: [],
        },
        audit: {
          total_actions: 0,
          last_action: "2025-01-01T00:00:00.000Z",
          log_retention_days: 90,
        },
      },
      privateKey: "old-private-key",
      status: "active" as const,
    };

    const identity2 = {
      passport: {
        passport_id: "ap_update1234",
        version: "1.0",
        identity: {
          name: "new-name",
          description: "New description",
          public_key: "new-pub-key",
          created_at: "2025-01-02T00:00:00.000Z",
        },
        owner: { id: "owner-1", email: "new@example.com", verified: true },
        capabilities: {},
        trust: {
          score: 70,
          level: "verified" as const,
          factors: {
            owner_verified: true,
            email_verified: true,
            age_days: 10,
            successful_auths: 5,
            abuse_reports: 0,
          },
        },
        credentials_vault: {
          services_count: 3,
          encrypted: true,
          encryption: "AES-256-GCM",
        },
        permissions: {
          max_registrations_per_day: 20,
          allowed_domains: [],
          blocked_domains: [],
          requires_owner_approval: [],
          auto_approved: [],
        },
        audit: {
          total_actions: 10,
          last_action: "2025-01-02T00:00:00.000Z",
          log_retention_days: 90,
        },
      },
      privateKey: "new-private-key",
      status: "revoked" as const,
    };

    await vault.storeIdentity(identity1);
    await vault.storeIdentity(identity2);

    const retrieved = await vault.getIdentity("ap_update1234");

    expect(retrieved).not.toBeNull();
    expect(retrieved!.passport.identity.name).toBe("new-name");
    expect(retrieved!.privateKey).toBe("new-private-key");
    expect(retrieved!.status).toBe("revoked");

    // Only one row for this passport_id
    const list = await vault.listIdentities();
    expect(list).toHaveLength(1);
  });

  it("should store identity data encrypted in the database", async () => {
    const privateKeyValue = "my-super-secret-private-key-12345";

    const testIdentity = {
      passport: {
        passport_id: "ap_encrypted1",
        version: "1.0",
        identity: {
          name: "encrypted-agent",
          description: "Test encryption",
          public_key: "pub-key",
          created_at: new Date().toISOString(),
        },
        owner: { id: "owner-1", email: "owner@example.com", verified: true },
        capabilities: {},
        trust: {
          score: 50,
          level: "basic" as const,
          factors: {
            owner_verified: true,
            email_verified: false,
            age_days: 0,
            successful_auths: 0,
            abuse_reports: 0,
          },
        },
        credentials_vault: {
          services_count: 0,
          encrypted: true,
          encryption: "AES-256-GCM",
        },
        permissions: {
          max_registrations_per_day: 10,
          allowed_domains: [],
          blocked_domains: [],
          requires_owner_approval: [],
          auto_approved: [],
        },
        audit: {
          total_actions: 0,
          last_action: new Date().toISOString(),
          log_retention_days: 90,
        },
      },
      privateKey: privateKeyValue,
      status: "active" as const,
    };

    await vault.storeIdentity(testIdentity);

    // Read the raw encrypted_data directly from SQLite
    const rawDb = vault._db!;
    const row = rawDb
      .prepare("SELECT encrypted_data FROM identities WHERE passport_id = ?")
      .get("ap_encrypted1") as { encrypted_data: string };

    expect(row).toBeDefined();

    // The raw value must NOT contain the plaintext private key
    expect(row.encrypted_data).not.toContain(privateKeyValue);
    expect(row.encrypted_data).not.toContain("encrypted-agent");
    expect(row.encrypted_data).not.toContain("owner@example.com");

    // It should look like a base64url string (the encrypted blob)
    expect(row.encrypted_data).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("should not allow decryption with a different private key", async () => {
    const testIdentity = {
      passport: {
        passport_id: "ap_crosskey1",
        version: "1.0",
        identity: {
          name: "cross-key-test",
          description: "Test",
          public_key: "pub-key",
          created_at: new Date().toISOString(),
        },
        owner: { id: "owner-1", email: "owner@example.com", verified: true },
        capabilities: {},
        trust: {
          score: 50,
          level: "basic" as const,
          factors: {
            owner_verified: true,
            email_verified: false,
            age_days: 0,
            successful_auths: 0,
            abuse_reports: 0,
          },
        },
        credentials_vault: {
          services_count: 0,
          encrypted: true,
          encryption: "AES-256-GCM",
        },
        permissions: {
          max_registrations_per_day: 10,
          allowed_domains: [],
          blocked_domains: [],
          requires_owner_approval: [],
          auto_approved: [],
        },
        audit: {
          total_actions: 0,
          last_action: new Date().toISOString(),
          log_retention_days: 90,
        },
      },
      privateKey: "secret-private-key",
      status: "active" as const,
    };

    await vault.storeIdentity(testIdentity);

    vault.close();

    // Open the same database with a different private key
    const otherKey = randomPrivateKey();
    const otherVault = new CredentialVault(dbPath, otherKey);
    await otherVault.init();

    try {
      // Attempting to decrypt data encrypted with a different key should throw
      await expect(otherVault.getIdentity("ap_crosskey1")).rejects.toThrow();
    } finally {
      otherVault.close();
    }
  });

  it("should handle an empty vault for listIdentities()", async () => {
    const list = await vault.listIdentities();
    expect(list).toEqual([]);
  });

  it("should throw if identity methods are called before init()", async () => {
    const uninitVault = new CredentialVault(tmpDbPath(), randomPrivateKey());

    const testIdentity = {
      passport: {
        passport_id: "ap_test123456",
        version: "1.0",
        identity: {
          name: "test",
          description: "test",
          public_key: "pub",
          created_at: new Date().toISOString(),
        },
        owner: { id: "owner-1", email: "owner@example.com", verified: true },
        capabilities: {},
        trust: {
          score: 50,
          level: "basic" as const,
          factors: {
            owner_verified: true,
            email_verified: false,
            age_days: 0,
            successful_auths: 0,
            abuse_reports: 0,
          },
        },
        credentials_vault: {
          services_count: 0,
          encrypted: true,
          encryption: "AES-256-GCM",
        },
        permissions: {
          max_registrations_per_day: 10,
          allowed_domains: [],
          blocked_domains: [],
          requires_owner_approval: [],
          auto_approved: [],
        },
        audit: {
          total_actions: 0,
          last_action: new Date().toISOString(),
          log_retention_days: 90,
        },
      },
      privateKey: "priv",
      status: "active" as const,
    };

    await expect(uninitVault.storeIdentity(testIdentity)).rejects.toThrow(
      /not initialized/i,
    );

    await expect(uninitVault.getIdentity("ap_test123456")).rejects.toThrow(
      /not initialized/i,
    );

    await expect(uninitVault.listIdentities()).rejects.toThrow(
      /not initialized/i,
    );

    await expect(uninitVault.deleteIdentity("ap_test123456")).rejects.toThrow(
      /not initialized/i,
    );

    await expect(uninitVault.hasIdentity("ap_test123456")).rejects.toThrow(
      /not initialized/i,
    );
  });
});
