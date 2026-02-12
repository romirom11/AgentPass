/**
 * Test helper for creating and initializing IdentityService with a vault.
 */

import { CredentialVault, generateKeyPair } from "@agentpass/core";
import { IdentityService } from "../services/identity-service.js";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { randomBytes } from "node:crypto";

function tmpDbPath(): string {
  const name = `agentpass-test-${Date.now()}-${randomBytes(4).toString("hex")}.db`;
  return path.join(os.tmpdir(), name);
}

/**
 * Create and initialize an IdentityService with a temporary vault.
 *
 * Returns the service and a cleanup function that should be called in afterEach.
 */
export async function createTestIdentityService(): Promise<{
  identityService: IdentityService;
  vault: CredentialVault;
  cleanup: () => void;
}> {
  const dbPath = tmpDbPath();
  const privateKey = generateKeyPair().privateKey;
  const vault = new CredentialVault(dbPath, privateKey);
  await vault.init();

  const identityService = new IdentityService();
  await identityService.init(vault);

  const cleanup = () => {
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
  };

  return { identityService, vault, cleanup };
}
