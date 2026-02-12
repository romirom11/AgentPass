/**
 * Client for interacting with Cloudflare Email Worker.
 *
 * Provides methods to retrieve emails from the worker's HTTP API.
 */

export interface EmailMessage {
  id: string;
  to: string;
  from: string;
  subject: string;
  body: string;
  html?: string;
  received_at: string;
  headers?: Record<string, string>;
}

export class CloudflareEmailClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'https://email.agent-mail.xyz') {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * List all emails for a given address.
   */
  async listEmails(address: string): Promise<EmailMessage[]> {
    const response = await fetch(`${this.baseUrl}/emails/${encodeURIComponent(address)}`);

    if (!response.ok) {
      throw new Error(`Failed to list emails: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as EmailMessage[];
  }

  /**
   * Get a specific email by ID.
   */
  async getEmail(address: string, emailId: string): Promise<EmailMessage | null> {
    const response = await fetch(
      `${this.baseUrl}/emails/${encodeURIComponent(address)}/${encodeURIComponent(emailId)}`
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to get email: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as EmailMessage;
  }

  /**
   * Delete an email.
   */
  async deleteEmail(address: string, emailId: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/emails/${encodeURIComponent(address)}/${encodeURIComponent(emailId)}`,
      { method: 'DELETE' }
    );

    if (!response.ok) {
      throw new Error(`Failed to delete email: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Wait for an email matching the given filter.
   * Polls the worker API until a matching email is found or timeout.
   */
  async waitForEmail(
    address: string,
    filter?: { from?: string; subject?: string },
    timeout: number = 30_000
  ): Promise<EmailMessage> {
    const deadline = Date.now() + timeout;
    const pollInterval = 1000; // 1 second

    while (Date.now() < deadline) {
      const emails = await this.listEmails(address);

      // Filter emails
      const matches = emails.filter((email) => {
        if (filter?.from && !email.from.toLowerCase().includes(filter.from.toLowerCase())) {
          return false;
        }
        if (filter?.subject && !email.subject.toLowerCase().includes(filter.subject.toLowerCase())) {
          return false;
        }
        return true;
      });

      if (matches.length > 0) {
        // Return the most recent match
        return matches[0]!;
      }

      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Timed out waiting for email to ${address}`);
  }

  /**
   * Extract verification/confirmation URLs from an email.
   */
  extractVerificationLink(email: EmailMessage): string | undefined {
    // Try HTML href first
    if (email.html) {
      const hrefMatch = email.html.match(
        /href=["']?(https?:\/\/[^\s"'<>]+(?:verif|confirm|activate|token|auth|callback)[^\s"'<>]*)/i
      );
      if (hrefMatch) return this.decodeHtmlEntities(hrefMatch[1]!);
    }

    // Try plain text
    const urlPattern =
      /https?:\/\/[^\s<>"']+(?:verif|confirm|activate|token|auth|callback)[^\s<>"']*/gi;
    const bodyMatch = email.body.match(urlPattern);
    if (bodyMatch) return bodyMatch[0]!;

    // Last resort: any URL
    const anyUrl = /https?:\/\/[^\s<>"']+/g;
    const htmlAny = email.html?.match(anyUrl);
    if (htmlAny) return this.decodeHtmlEntities(htmlAny[0]!);

    const bodyAny = email.body.match(anyUrl);
    if (bodyAny) return bodyAny[0]!;

    return undefined;
  }

  /**
   * Extract OTP code (4-8 digits) from an email.
   */
  extractOtpCode(email: EmailMessage): string | undefined {
    const text = email.html ? this.stripHtml(email.html) : email.body;

    const patterns = [
      /(?:code|otp|pin|token|password)\s*(?:is|:)\s*(\d{4,8})/i,
      /(\d{4,8})\s*(?:is your|is the)\s*(?:code|otp|pin|verification)/i,
      /\b(\d{4,8})\b/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) return match[1];
    }

    return undefined;
  }

  // Helper methods
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private decodeHtmlEntities(str: string): string {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
}
