/**
 * Identity management service.
 *
 * Manages agent identity creation, storage, and retrieval.
 * Uses encrypted SQLite vault for persistent storage.
 */

import {
  generateKeyPair,
  createPassport,
  CredentialVault,
  type KeyPair,
  type AgentPassport,
  type StoredIdentity,
  type IdentityListEntry,
} from "@agentpass/core";
import type { ApiClient } from "./api-client.js";

export interface IdentitySummary {
  passport_id: string;
  name: string;
  status: "active" | "revoked";
  created_at: string;
}

export interface CreateIdentityResult {
  passport: AgentPassport;
  publicKey: string;
  apiRegistered: boolean;
  email?: string;
}

export class IdentityService {
  private vault: CredentialVault | null = null;
  private apiClient: ApiClient | undefined;

  /**
   * Initialize the service with a vault instance and optional API client.
   *
   * Must be called before any other method. If apiClient is provided,
   * identities will be registered on the API server during creation.
   */
  async init(vault: CredentialVault, apiClient?: ApiClient): Promise<void> {
    this.vault = vault;
    this.apiClient = apiClient;
  }

  /**
   * Create a new agent identity.
   *
   * Generates an Ed25519 key pair, builds a passport, and stores everything
   * in the encrypted vault. The private key never leaves the local store.
   *
   * If an API client is configured, the passport is also registered on the
   * AgentPass API server. Registration failure is non-fatal (graceful
   * degradation) -- the passport is still created locally.
   */
  async createIdentity(input: {
    name: string;
    description?: string;
    owner_email: string;
  }): Promise<CreateIdentityResult> {
    this.ensureInitialized();

    const keyPair: KeyPair = generateKeyPair();
    const passport = createPassport(
      {
        name: input.name,
        description: input.description ?? "",
        owner_email: input.owner_email,
      },
      keyPair.publicKey,
    );

    const storedIdentity: StoredIdentity = {
      passport,
      privateKey: keyPair.privateKey,
      status: "active",
    };

    await this.vault!.storeIdentity(storedIdentity);

    // Register on API server if client is available
    if (this.apiClient) {
      try {
        const apiResult = await this.apiClient.registerPassport({
          passport_id: passport.passport_id,
          public_key: keyPair.publicKey,
          name: input.name,
          description: input.description ?? "",
        });
        return {
          passport,
          publicKey: keyPair.publicKey,
          apiRegistered: true,
          email: apiResult.email,
        };
      } catch (error) {
        console.warn(
          `[AgentPass] Failed to register passport on API server: ${error instanceof Error ? error.message : String(error)}`,
        );
        return { passport, publicKey: keyPair.publicKey, apiRegistered: false };
      }
    }

    return { passport, publicKey: keyPair.publicKey, apiRegistered: false };
  }

  /**
   * List all stored identities (summary only, no secrets).
   */
  async listIdentities(): Promise<IdentitySummary[]> {
    this.ensureInitialized();

    const entries: IdentityListEntry[] = await this.vault!.listIdentities();
    return entries;
  }

  /**
   * Retrieve a single identity by passport_id.
   *
   * Returns the full passport (public info only) or null if not found.
   */
  async getIdentity(passportId: string): Promise<AgentPassport | null> {
    this.ensureInitialized();

    const stored = await this.vault!.getIdentity(passportId);
    if (!stored) {
      return null;
    }
    return stored.passport;
  }

  /**
   * Delete an identity by passport_id.
   *
   * Returns true if the identity existed and was removed, false otherwise.
   */
  async deleteIdentity(passportId: string): Promise<boolean> {
    this.ensureInitialized();

    return await this.vault!.deleteIdentity(passportId);
  }

  /**
   * Revoke an identity (mark as revoked, keep in store for audit).
   */
  async revokeIdentity(passportId: string): Promise<boolean> {
    this.ensureInitialized();

    const stored = await this.vault!.getIdentity(passportId);
    if (!stored) {
      return false;
    }

    stored.status = "revoked";
    await this.vault!.storeIdentity(stored);
    return true;
  }

  /**
   * Get the private key for a given passport ID.
   *
   * This is used internally for signing operations.
   * The private key should never be exposed outside the service layer.
   */
  async getPrivateKey(passportId: string): Promise<string | null> {
    this.ensureInitialized();

    const stored = await this.vault!.getIdentity(passportId);
    if (!stored) {
      return null;
    }
    return stored.privateKey;
  }

  /** Throw if `init()` has not been called. */
  private ensureInitialized(): void {
    if (!this.vault) {
      throw new Error("IdentityService is not initialized. Call init() first.");
    }
  }
}
