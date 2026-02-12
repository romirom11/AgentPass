#!/usr/bin/env node

/**
 * AgentPass MCP Server entry point.
 *
 * Starts a Model Context Protocol server over stdio transport. AI agents
 * connect to this server to manage identities, credentials, and authentication.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { IdentityService } from "./services/identity-service.js";
import { CredentialService } from "./services/credential-service.js";
import { AuthService } from "./services/auth-service.js";
import { EmailServiceAdapter } from "./services/email-service-adapter.js";
import { SmsService } from "./services/sms-service.js";
import { registerAllTools } from "./tools/index.js";
import { CredentialVault, generateKeyPair } from "@agentpass/core";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

const SERVER_NAME = "agentpass";
const SERVER_VERSION = "0.1.0";

/**
 * Get or create the vault master key.
 *
 * The master key is stored in ~/.agentpass/master.key and is used to
 * derive encryption keys for the vault. If the key file doesn't exist,
 * a new key pair is generated and the private key is stored.
 */
function getOrCreateMasterKey(): string {
  const agentpassDir = path.join(os.homedir(), ".agentpass");
  const keyPath = path.join(agentpassDir, "master.key");

  if (fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, "utf-8").trim();
  }

  // Create directory if it doesn't exist
  fs.mkdirSync(agentpassDir, { recursive: true });

  // Generate a new key pair
  const keyPair = generateKeyPair();

  // Store the private key (this is the master encryption key)
  fs.writeFileSync(keyPath, keyPair.privateKey, { mode: 0o600 });

  return keyPair.privateKey;
}

/**
 * Get the vault database path.
 *
 * Returns ~/.agentpass/vault.db
 */
function getVaultPath(): string {
  const agentpassDir = path.join(os.homedir(), ".agentpass");
  fs.mkdirSync(agentpassDir, { recursive: true });
  return path.join(agentpassDir, "vault.db");
}

async function createServer(): Promise<McpServer> {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      capabilities: {
        tools: {},
      },
      instructions:
        "AgentPass MCP Server provides identity management and credential storage for AI agents. " +
        "Use create_identity to generate a new agent passport, list_identities to see all identities, " +
        "and store_credential / get_credential to manage service credentials.",
    },
  );

  // Initialize the encrypted vault
  const masterKey = getOrCreateMasterKey();
  const vaultPath = getVaultPath();
  const vault = new CredentialVault(vaultPath, masterKey);
  await vault.init();

  // Initialize services
  const identityService = new IdentityService();
  await identityService.init(vault);

  const credentialService = new CredentialService();
  const authService = new AuthService(identityService, credentialService);
  const emailService = new EmailServiceAdapter();
  const smsService = new SmsService();

  registerAllTools(server, {
    identityService,
    credentialService,
    authService,
    emailService,
    smsService,
  });

  return server;
}

async function main(): Promise<void> {
  const server = await createServer();
  const transport = new StdioServerTransport();

  // Graceful shutdown on SIGINT / SIGTERM
  const shutdown = async () => {
    await server.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await server.connect(transport);
}

main().catch((error: unknown) => {
  console.error("Fatal error starting AgentPass MCP server:", error);
  process.exit(1);
});

export { createServer };
