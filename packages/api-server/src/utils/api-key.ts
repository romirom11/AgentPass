/**
 * API key generation and validation utilities.
 *
 * API keys follow the format: ak_live_ + 48 hex characters (24 random bytes).
 * The first 16 characters serve as a prefix for identification in the UI.
 */

import crypto from "node:crypto";

const API_KEY_PREFIX = "ak_live_";
const API_KEY_HEX_LENGTH = 48; // 24 bytes = 48 hex chars
const KEY_PREFIX_LENGTH = 16; // first 16 chars of full key for UI identification

/**
 * Generate a new API key.
 *
 * @returns The full API key string (e.g., ak_live_abcdef1234567890...)
 */
export function generateApiKey(): string {
  const randomHex = crypto.randomBytes(API_KEY_HEX_LENGTH / 2).toString("hex");
  return `${API_KEY_PREFIX}${randomHex}`;
}

/**
 * Extract the display prefix from a full API key.
 *
 * The prefix is the first 16 characters of the full key (including the ak_live_ part),
 * used for identification in the UI without exposing the full key.
 *
 * @param key - Full API key
 * @returns The key prefix for display
 */
export function extractKeyPrefix(key: string): string {
  return key.slice(0, KEY_PREFIX_LENGTH);
}

/**
 * Check whether a string looks like an API key by format.
 *
 * @param token - String to check
 * @returns true if the token has the API key format
 */
export function isApiKeyFormat(token: string): boolean {
  // ak_live_ (8 chars) + 48 hex chars = 56 total
  const pattern = new RegExp(`^${API_KEY_PREFIX}[a-f0-9]{${API_KEY_HEX_LENGTH}}$`);
  return pattern.test(token);
}
