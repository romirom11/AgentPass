import { randomUUID } from 'node:crypto';
import type { IncomingEmail, EmailFilter } from './types.js';

const DEFAULT_WAIT_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 200;

/**
 * In-memory email store for agent mailboxes.
 * Production will use Cloudflare Email Workers; this provides the
 * local development / test implementation.
 */
export class EmailStore {
  /** address (lowercased) -> emails ordered by received_at */
  private store = new Map<string, IncomingEmail[]>();

  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly MAX_EMAILS_PER_ADDRESS = 100;
  private readonly EMAIL_TTL_MS = 60 * 60 * 1000; // 1 hour

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------

  /**
   * Store an incoming email. Assigns an `id` if one is not already set.
   */
  addEmail(email: IncomingEmail): IncomingEmail {
    const stored: IncomingEmail = {
      ...email,
      id: email.id || randomUUID(),
      to: email.to.toLowerCase(),
      from: email.from.toLowerCase(),
    };

    const key = stored.to;
    const bucket = this.store.get(key) ?? [];
    bucket.push(stored);

    // Cap the number of emails per address
    if (bucket.length > this.MAX_EMAILS_PER_ADDRESS) {
      bucket.shift(); // Remove oldest
    }

    this.store.set(key, bucket);

    return stored;
  }

  /**
   * Retrieve emails for a given address, optionally filtered.
   */
  getEmails(address: string, filter?: EmailFilter): IncomingEmail[] {
    const bucket = this.store.get(address.toLowerCase()) ?? [];
    return this.applyFilter(bucket, filter);
  }

  /**
   * Retrieve a single email by its ID.
   */
  getEmail(id: string): IncomingEmail | undefined {
    for (const bucket of this.store.values()) {
      const found = bucket.find((e) => e.id === id);
      if (found) return found;
    }
    return undefined;
  }

  /**
   * Wait for an email matching the filter to arrive for `address`.
   * Resolves with the first matching email or rejects on timeout.
   */
  waitForEmail(
    address: string,
    filter?: EmailFilter,
    timeout: number = DEFAULT_WAIT_TIMEOUT_MS,
  ): Promise<IncomingEmail> {
    return new Promise<IncomingEmail>((resolve, reject) => {
      const deadline = Date.now() + timeout;

      const poll = (): void => {
        const matches = this.getEmails(address, filter);
        if (matches.length > 0) {
          resolve(matches[matches.length - 1]!);
          return;
        }

        if (Date.now() >= deadline) {
          reject(new Error(`Timed out waiting for email to ${address}`));
          return;
        }

        setTimeout(poll, POLL_INTERVAL_MS);
      };

      poll();
    });
  }

  /**
   * Extract verification / confirmation URLs from an email body.
   * Searches both the HTML (href attributes) and plain-text body.
   */
  extractVerificationLink(emailId: string): string | undefined {
    const email = this.getEmail(emailId);
    if (!email) return undefined;

    // Try HTML href first — more reliable
    if (email.html) {
      const hrefMatch = email.html.match(
        /href=["']?(https?:\/\/[^\s"'<>]+(?:verif|confirm|activate|token|auth|callback)[^\s"'<>]*)/i,
      );
      if (hrefMatch) return decodeHtmlEntities(hrefMatch[1]!);
    }

    // Fall back to plain-text URL scan
    const urlPattern =
      /https?:\/\/[^\s<>"']+(?:verif|confirm|activate|token|auth|callback)[^\s<>"']*/gi;

    const bodyMatch = email.body.match(urlPattern);
    if (bodyMatch) return bodyMatch[0]!;

    // Last resort: any URL in the body
    const anyUrl = /https?:\/\/[^\s<>"']+/g;
    const htmlAny = email.html?.match(anyUrl);
    if (htmlAny) return decodeHtmlEntities(htmlAny[0]!);

    const bodyAny = email.body.match(anyUrl);
    if (bodyAny) return bodyAny[0]!;

    return undefined;
  }

  /**
   * Extract a 4-8 digit OTP / verification code from an email body.
   */
  extractOtpCode(emailId: string): string | undefined {
    const email = this.getEmail(emailId);
    if (!email) return undefined;

    const text = email.html
      ? stripHtml(email.html)
      : email.body;

    // Common patterns: "code is 123456", "OTP: 7890", "code: 12345678"
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

  /**
   * Clear stored emails. If `address` is provided, clear only that
   * mailbox; otherwise clear everything.
   */
  clear(address?: string): void {
    if (address) {
      this.store.delete(address.toLowerCase());
    } else {
      this.store.clear();
    }
  }

  /**
   * Start automatic cleanup of old emails.
   * Runs cleanup every 5 minutes to remove emails older than 1 hour.
   */
  startCleanup(): void {
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Stop automatic cleanup and clear all stored emails.
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }

  /**
   * Remove emails older than EMAIL_TTL_MS and enforce MAX_EMAILS_PER_ADDRESS limit.
   */
  private cleanup(): void {
    const cutoff = new Date(Date.now() - this.EMAIL_TTL_MS);
    for (const [address, emails] of this.store.entries()) {
      const filtered = emails.filter(e => new Date(e.received_at) > cutoff);
      if (filtered.length === 0) {
        this.store.delete(address);
      } else {
        this.store.set(address, filtered.slice(-this.MAX_EMAILS_PER_ADDRESS));
      }
    }
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  private applyFilter(emails: IncomingEmail[], filter?: EmailFilter): IncomingEmail[] {
    if (!filter) return [...emails];

    return emails.filter((e) => {
      if (filter.from && !e.from.includes(filter.from.toLowerCase())) return false;
      if (filter.subject && !e.subject.toLowerCase().includes(filter.subject.toLowerCase()))
        return false;
      if (filter.after && e.received_at <= filter.after) return false;
      return true;
    });
  }
}

// ------------------------------------------------------------------
// Utility helpers
// ------------------------------------------------------------------

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
