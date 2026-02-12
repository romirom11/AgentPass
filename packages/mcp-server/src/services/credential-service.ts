/**
 * Credential management service.
 *
 * Stores and retrieves service credentials associated with an agent identity.
 * Uses the encrypted CredentialVault from @agentpass/core for persistent storage.
 */

import type { CredentialVault } from "@agentpass/core";

export interface Credential {
  service: string;
  username: string;
  password: string;
  email: string;
  stored_at: string;
}

export interface CredentialSummary {
  service: string;
  username: string;
  email: string;
  stored_at: string;
}

export class CredentialService {
  /** Optional vault for persistent encrypted storage */
  private vault: CredentialVault | null = null;

  /** In-memory fallback for testing (Map<passport_id, Map<service, Credential>>) */
  private memoryVaults = new Map<string, Map<string, Credential>>();

  /**
   * Initialize the credential service with a vault instance.
   * If not called, falls back to in-memory storage (for tests).
   */
  setVault(vault: CredentialVault): void {
    this.vault = vault;
  }

  /**
   * Store a credential for a given identity and service.
   *
   * Overwrites any existing credential for the same service.
   */
  async storeCredential(input: {
    passport_id: string;
    service: string;
    username: string;
    password: string;
    email: string;
  }): Promise<Credential> {
    const credential: Credential = {
      service: input.service,
      username: input.username,
      password: input.password,
      email: input.email,
      stored_at: new Date().toISOString(),
    };

    if (this.vault) {
      // Use vault with passport_id:service as the key to scope by passport
      const vaultKey = `${input.passport_id}:${input.service}`;
      await this.vault.store({
        service: vaultKey,
        username: input.username,
        password: input.password,
        email: input.email,
      });
    } else {
      // In-memory fallback for tests
      let memVault = this.memoryVaults.get(input.passport_id);
      if (!memVault) {
        memVault = new Map();
        this.memoryVaults.set(input.passport_id, memVault);
      }
      memVault.set(input.service, credential);
    }

    return credential;
  }

  /**
   * Retrieve a credential for a given identity and service.
   */
  async getCredential(passportId: string, service: string): Promise<Credential | null> {
    if (this.vault) {
      const vaultKey = `${passportId}:${service}`;
      const stored = await this.vault.get(vaultKey);
      if (!stored) {
        return null;
      }
      return {
        service,
        username: stored.username,
        password: stored.password,
        email: stored.email,
        stored_at: stored.registered_at,
      };
    } else {
      // In-memory fallback for tests
      const memVault = this.memoryVaults.get(passportId);
      if (!memVault) {
        return null;
      }
      return memVault.get(service) ?? null;
    }
  }

  /**
   * List all credentials for an identity (summaries only, no passwords).
   */
  async listCredentials(passportId: string): Promise<CredentialSummary[]> {
    if (this.vault) {
      // List all credentials and filter by passport_id prefix
      const allCreds = await this.vault.list();
      const prefix = `${passportId}:`;

      return allCreds
        .filter(cred => cred.service.startsWith(prefix))
        .map(cred => ({
          service: cred.service.substring(prefix.length), // Remove prefix
          username: cred.username,
          email: cred.email,
          stored_at: cred.registered_at,
        }));
    } else {
      // In-memory fallback for tests
      const memVault = this.memoryVaults.get(passportId);
      if (!memVault) {
        return [];
      }

      const result: CredentialSummary[] = [];
      for (const cred of memVault.values()) {
        result.push({
          service: cred.service,
          username: cred.username,
          email: cred.email,
          stored_at: cred.stored_at,
        });
      }
      return result;
    }
  }

  /**
   * Delete a credential for a given identity and service.
   */
  async deleteCredential(passportId: string, service: string): Promise<boolean> {
    if (this.vault) {
      const vaultKey = `${passportId}:${service}`;
      return await this.vault.delete(vaultKey);
    } else {
      // In-memory fallback for tests
      const memVault = this.memoryVaults.get(passportId);
      if (!memVault) {
        return false;
      }
      return memVault.delete(service);
    }
  }
}
