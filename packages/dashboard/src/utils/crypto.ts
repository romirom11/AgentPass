/**
 * Browser-side cryptography utilities using WebCrypto API.
 *
 * Generates Ed25519 key pairs for agent identity.
 */

/**
 * Generate an Ed25519 key pair using WebCrypto API.
 *
 * @returns Promise resolving to base64url-encoded public and private keys
 * @throws Error if WebCrypto API doesn't support Ed25519
 */
export async function generateEd25519KeyPair(): Promise<{
  publicKey: string;  // base64url encoded SPKI format
  privateKey: string; // base64url encoded PKCS8 format
}> {
  // Check if Ed25519 is supported
  if (!crypto.subtle) {
    throw new Error("WebCrypto API not available in this browser");
  }

  try {
    // Generate Ed25519 key pair
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "Ed25519",
      },
      true, // extractable - we need to export keys
      ["sign", "verify"]
    );

    // Export keys in standard formats
    const publicKeyBuffer = await crypto.subtle.exportKey("spki", keyPair.publicKey);
    const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

    // Encode to base64url
    return {
      publicKey: bufferToBase64Url(publicKeyBuffer),
      privateKey: bufferToBase64Url(privateKeyBuffer),
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Ed25519")) {
      throw new Error(
        "Ed25519 not supported in this browser. Please use Chrome 113+, Firefox 130+, or Safari 17+"
      );
    }
    throw error;
  }
}

/**
 * Convert ArrayBuffer to base64url string.
 *
 * Base64url encoding (RFC 4648 Section 5):
 * - Uses - instead of +
 * - Uses _ instead of /
 * - No padding (=)
 */
function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Copy text to clipboard using modern Clipboard API.
 *
 * @param text Text to copy
 * @returns Promise resolving when copy is complete
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (!navigator.clipboard) {
    throw new Error("Clipboard API not available in this browser");
  }
  await navigator.clipboard.writeText(text);
}
