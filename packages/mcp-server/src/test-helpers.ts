/**
 * Test helpers and utilities for integration tests.
 */

import { CredentialVault, generateKeyPair } from "@agentpass/core";
import { IdentityService } from "./services/identity-service.js";

/**
 * Create and initialize an IdentityService with an in-memory vault.
 * Returns both the service and vault for cleanup.
 */
export async function createTestIdentityService(): Promise<{
  identityService: IdentityService;
  vault: CredentialVault;
}> {
  const { privateKey } = generateKeyPair();
  const vault = new CredentialVault(":memory:", privateKey);
  await vault.init();

  const identityService = new IdentityService();
  await identityService.init(vault);

  return { identityService, vault };
}
