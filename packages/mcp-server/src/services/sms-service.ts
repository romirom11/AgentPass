/**
 * SMS verification service (in-memory mock implementation).
 *
 * Handles phone number provisioning and SMS reception for agent verification.
 * Used for development and testing when Twilio credentials are not available.
 */

import type {
  SmsServiceInterface,
  SmsMessage,
  SmsFilter,
} from "./sms-service-interface.js";

// Re-export for backward compatibility
export type { SmsMessage, SmsFilter } from "./sms-service-interface.js";

/**
 * OTP extraction patterns, ordered from most specific to least specific.
 * Matches common formats: "code is 123456", "OTP: 7890", standalone 4-8 digits.
 */
export const OTP_PATTERNS: RegExp[] = [
  /(?:code|otp|pin|token|password)\s*(?:is|:)\s*(\d{4,8})/i,
  /(\d{4,8})\s*(?:is your|is the)/i,
  /\b(\d{4,8})\b/,
];

export class SmsService implements SmsServiceInterface {
  /** phone number -> passport ID */
  private readonly phoneToPassport = new Map<string, string>();
  /** passport ID -> phone number */
  private readonly passportToPhone = new Map<string, string>();
  /** phone number -> list of messages */
  private readonly inbox = new Map<string, SmsMessage[]>();
  /** message ID -> SmsMessage */
  private readonly messageById = new Map<string, SmsMessage>();
  /** Listeners waiting for an SMS on a specific number */
  private readonly waiters = new Map<
    string,
    Array<(message: SmsMessage) => void>
  >();

  /**
   * Counter used to generate deterministic mock phone numbers.
   * Starts at 1000000 so numbers look realistic.
   */
  private phoneCounter = 1000000;

  /**
   * Get (or provision) a mock phone number for the given passport ID.
   *
   * Returns the same number on repeated calls with the same passport.
   * Format: +1555XXXXXXX
   */
  async getPhoneNumber(passportId: string): Promise<string> {
    const existing = this.passportToPhone.get(passportId);
    if (existing) return existing;

    const number = `+1555${String(this.phoneCounter).padStart(7, "0")}`;
    this.phoneCounter++;

    this.passportToPhone.set(passportId, number);
    this.phoneToPassport.set(number, passportId);
    this.inbox.set(number, []);

    return number;
  }

  /**
   * Release a phone number back to the pool.
   * No-op for mock implementation since numbers are unlimited.
   */
  async releasePhoneNumber(_passportId: string): Promise<void> {
    // No-op for mock
  }

  /**
   * Store an incoming SMS message and notify any waiting consumers.
   */
  addSms(message: SmsMessage): void {
    this.messageById.set(message.id, message);

    const messages = this.inbox.get(message.to) ?? [];
    messages.push(message);
    this.inbox.set(message.to, messages);

    // Resolve the first waiter for this phone number
    const waiters = this.waiters.get(message.to);
    if (waiters && waiters.length > 0) {
      const resolve = waiters.shift()!;
      resolve(message);
      if (waiters.length === 0) {
        this.waiters.delete(message.to);
      }
    }
  }

  /**
   * Wait for an SMS to arrive at the given phone number.
   *
   * If there are already unread messages, resolves with the most recent one.
   * Otherwise waits up to `timeout` ms for a new message.
   *
   * @param phoneNumber - The phone number to listen on
   * @param filter - Optional filter for sender, body content, or timestamp
   * @param timeoutMs - Timeout in milliseconds (default: 30000)
   */
  async waitForSms(
    phoneNumber: string,
    filter?: SmsFilter,
    timeoutMs = 30000,
  ): Promise<SmsMessage> {
    // Check for existing messages first
    const existing = this.inbox.get(phoneNumber);
    if (existing && existing.length > 0) {
      // Apply filter if provided
      const filtered = this.filterMessages(existing, filter);
      if (filtered.length > 0) {
        return filtered[filtered.length - 1]!;
      }
    }

    return new Promise<SmsMessage>((resolve, reject) => {
      const timer = setTimeout(() => {
        // Remove this waiter on timeout
        const waiters = this.waiters.get(phoneNumber);
        if (waiters) {
          const idx = waiters.indexOf(resolveWrapper);
          if (idx !== -1) waiters.splice(idx, 1);
          if (waiters.length === 0) this.waiters.delete(phoneNumber);
        }
        reject(new Error(`Timed out waiting for SMS to ${phoneNumber}`));
      }, timeoutMs);

      const resolveWrapper = (msg: SmsMessage) => {
        // Check filter before resolving
        if (this.matchesFilter(msg, filter)) {
          clearTimeout(timer);
          resolve(msg);
        }
      };

      const waiters = this.waiters.get(phoneNumber) ?? [];
      waiters.push(resolveWrapper);
      this.waiters.set(phoneNumber, waiters);
    });
  }

  /**
   * Filter messages based on criteria.
   */
  private filterMessages(
    messages: SmsMessage[],
    filter?: SmsFilter,
  ): SmsMessage[] {
    if (!filter) return messages;

    return messages.filter((msg) => this.matchesFilter(msg, filter));
  }

  /**
   * Check if a message matches the filter criteria.
   */
  private matchesFilter(msg: SmsMessage, filter?: SmsFilter): boolean {
    if (!filter) return true;

    if (filter.from && msg.from !== filter.from) return false;
    if (filter.bodyContains && !msg.body.includes(filter.bodyContains))
      return false;
    if (filter.after && new Date(msg.received_at) <= filter.after) return false;

    return true;
  }

  /**
   * Extract a 4-8 digit OTP code from an SMS body.
   *
   * Tries several common OTP patterns (e.g. "Your code is 123456", "OTP: 7890").
   * Returns null if no code is found.
   */
  extractOtpFromSms(smsBody: string): string | null {
    for (const pattern of OTP_PATTERNS) {
      const match = smsBody.match(pattern);
      if (match?.[1]) return match[1];
    }

    return null;
  }

  /**
   * Legacy method: Extract OTP by message ID (for backward compatibility).
   * @deprecated Use extractOtpFromSms(smsBody) instead.
   */
  extractOtpFromSmsById(smsId: string): string | null {
    const message = this.messageById.get(smsId);
    if (!message) return null;

    return this.extractOtpFromSms(message.body);
  }

  /**
   * List all SMS messages received at the given phone number.
   */
  listSms(phoneNumber: string): SmsMessage[] {
    return this.inbox.get(phoneNumber) ?? [];
  }
}
