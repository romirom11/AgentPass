/**
 * Production Twilio SMS service implementation.
 *
 * Manages a pool of Twilio phone numbers and handles SMS reception via webhooks.
 * This is a GLOBAL service — one Twilio account serves all agents.
 */

import Twilio from "twilio";
import type {
  SmsServiceInterface,
  SmsMessage,
  SmsFilter,
} from "./sms-service-interface.js";
import { OTP_PATTERNS } from "./sms-service.js";

// Re-export types
export type { SmsMessage, SmsFilter } from "./sms-service-interface.js";

/**
 * Notification poller function that fetches new SMS from API server.
 * Must be provided by the caller (MCP server).
 */
export type SmsNotificationPoller = (
  phoneNumber: string,
) => Promise<SmsMessage[]>;

interface PhoneNumberAssignment {
  passportId: string;
  assignedAt: Date;
}

export class TwilioSmsService implements SmsServiceInterface {
  private readonly client: Twilio.Twilio;
  private readonly phoneNumberPool: string[];
  private readonly assignedNumbers = new Map<string, PhoneNumberAssignment>(); // phone -> assignment
  private readonly passportToPhone = new Map<string, string>(); // passport -> phone
  private readonly smsInbox = new Map<string, SmsMessage[]>(); // phone -> messages
  private readonly waiters = new Map<
    string,
    Array<{ resolve: (msg: SmsMessage) => void; filter?: SmsFilter }>
  >();
  private readonly apiBaseUrl: string;
  private readonly notificationPoller?: SmsNotificationPoller;

  /**
   * Polling interval for checking new SMS notifications (in milliseconds).
   * Default: 2 seconds
   */
  private readonly pollingInterval = 2000;

  /**
   * Active polling timers for each phone number.
   */
  private readonly pollingTimers = new Map<string, NodeJS.Timeout>();

  /**
   * Create a new TwilioSmsService.
   *
   * @param accountSid - Twilio Account SID (from TWILIO_ACCOUNT_SID)
   * @param authToken - Twilio Auth Token (from TWILIO_AUTH_TOKEN)
   * @param phoneNumbers - Comma-separated list of phone numbers in the pool
   * @param apiBaseUrl - Base URL of AgentPass API server (for webhook polling)
   * @param notificationPoller - Optional custom poller function
   */
  constructor(
    accountSid: string,
    authToken: string,
    phoneNumbers: string,
    apiBaseUrl: string,
    notificationPoller?: SmsNotificationPoller,
  ) {
    this.client = Twilio(accountSid, authToken);
    this.phoneNumberPool = phoneNumbers
      .split(",")
      .map((num) => num.trim())
      .filter(Boolean);
    this.apiBaseUrl = apiBaseUrl.replace(/\/$/, ""); // Remove trailing slash
    this.notificationPoller = notificationPoller;

    if (this.phoneNumberPool.length === 0) {
      throw new Error(
        "No phone numbers configured. Set TWILIO_PHONE_NUMBERS env var.",
      );
    }

    console.log(
      `[TwilioSmsService] Initialized with ${this.phoneNumberPool.length} phone numbers in pool`,
    );
  }

  /**
   * Get (or assign) a phone number for the given passport/agent.
   *
   * If the agent already has a number, returns it.
   * Otherwise, assigns an available number from the pool.
   * If the pool is exhausted, provisions a new number via Twilio API.
   */
  async getPhoneNumber(passportId: string): Promise<string> {
    // Check if already assigned
    const existing = this.passportToPhone.get(passportId);
    if (existing) return existing;

    // Find an available number from the pool
    for (const phoneNumber of this.phoneNumberPool) {
      if (!this.assignedNumbers.has(phoneNumber)) {
        return this.assignNumber(passportId, phoneNumber);
      }
    }

    // Pool exhausted — provision a new number
    console.log(
      `[TwilioSmsService] Pool exhausted, provisioning new number for ${passportId}`,
    );
    return this.provisionNewNumber(passportId);
  }

  /**
   * Assign a phone number to a passport.
   */
  private assignNumber(passportId: string, phoneNumber: string): string {
    this.assignedNumbers.set(phoneNumber, {
      passportId,
      assignedAt: new Date(),
    });
    this.passportToPhone.set(passportId, phoneNumber);
    this.smsInbox.set(phoneNumber, []);

    console.log(
      `[TwilioSmsService] Assigned ${phoneNumber} to passport ${passportId}`,
    );
    return phoneNumber;
  }

  /**
   * Provision a new phone number via Twilio API.
   *
   * Searches for available US numbers and purchases one.
   */
  private async provisionNewNumber(passportId: string): Promise<string> {
    try {
      // Search for available local numbers (US)
      const numbers =
        await this.client.availablePhoneNumbers("US").local.list({
          limit: 1,
        });

      if (numbers.length === 0) {
        throw new Error("No available phone numbers from Twilio");
      }

      const availableNumber = numbers[0]!.phoneNumber;

      // Purchase the number
      const purchased = await this.client.incomingPhoneNumbers.create({
        phoneNumber: availableNumber,
        smsUrl: `${this.apiBaseUrl}/webhook/sms-received`,
        smsMethod: "POST",
      });

      console.log(
        `[TwilioSmsService] Provisioned new number: ${purchased.phoneNumber}`,
      );

      // Add to pool
      this.phoneNumberPool.push(purchased.phoneNumber);

      // Assign to passport
      return this.assignNumber(passportId, purchased.phoneNumber);
    } catch (error) {
      console.error(
        "[TwilioSmsService] Failed to provision new number:",
        error,
      );
      throw new Error(
        `Failed to provision phone number: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Release a phone number back to the pool.
   *
   * The number becomes available for other agents.
   * Clears the SMS inbox for that number.
   */
  async releasePhoneNumber(passportId: string): Promise<void> {
    const phoneNumber = this.passportToPhone.get(passportId);
    if (!phoneNumber) return;

    this.assignedNumbers.delete(phoneNumber);
    this.passportToPhone.delete(passportId);
    this.smsInbox.delete(phoneNumber);

    // Stop polling for this number
    this.stopPolling(phoneNumber);

    console.log(
      `[TwilioSmsService] Released ${phoneNumber} from passport ${passportId}`,
    );
  }

  /**
   * Wait for an SMS to arrive at the given phone number.
   *
   * Starts polling the API server for new SMS and resolves when a matching
   * message arrives.
   */
  async waitForSms(
    phoneNumber: string,
    filter?: SmsFilter,
    timeoutMs = 30000,
  ): Promise<SmsMessage> {
    // Check for existing messages first
    const existing = this.smsInbox.get(phoneNumber) ?? [];
    const filtered = this.filterMessages(existing, filter);
    if (filtered.length > 0) {
      return filtered[filtered.length - 1]!;
    }

    // Start polling for new messages
    this.startPolling(phoneNumber);

    return new Promise<SmsMessage>((resolve, reject) => {
      const timer = setTimeout(() => {
        // Remove this waiter on timeout
        const waiters = this.waiters.get(phoneNumber);
        if (waiters) {
          const idx = waiters.findIndex((w) => w.resolve === resolve);
          if (idx !== -1) waiters.splice(idx, 1);
          if (waiters.length === 0) {
            this.waiters.delete(phoneNumber);
            this.stopPolling(phoneNumber);
          }
        }
        reject(new Error(`Timed out waiting for SMS to ${phoneNumber}`));
      }, timeoutMs);

      const waiters = this.waiters.get(phoneNumber) ?? [];
      waiters.push({
        resolve: (msg: SmsMessage) => {
          clearTimeout(timer);
          resolve(msg);
        },
        filter,
      });
      this.waiters.set(phoneNumber, waiters);
    });
  }

  /**
   * Extract a 4-8 digit OTP code from an SMS body.
   *
   * Uses the same patterns as the mock service.
   */
  extractOtpFromSms(smsBody: string): string | null {
    for (const pattern of OTP_PATTERNS) {
      const match = smsBody.match(pattern);
      if (match?.[1]) return match[1];
    }

    return null;
  }

  /**
   * Handle an incoming SMS from Twilio webhook.
   *
   * Called by the API server when it receives a webhook from Twilio.
   * Stores the message and notifies any waiting consumers.
   */
  handleIncomingSms(sms: SmsMessage): void {
    const messages = this.smsInbox.get(sms.to) ?? [];
    messages.push(sms);
    this.smsInbox.set(sms.to, messages);

    // Cleanup old messages (keep last 5 minutes only)
    this.cleanupOldMessages(sms.to);

    // Notify waiters
    const waiters = this.waiters.get(sms.to);
    if (waiters && waiters.length > 0) {
      // Find the first waiter that matches the filter
      for (let i = 0; i < waiters.length; i++) {
        const waiter = waiters[i]!;
        if (this.matchesFilter(sms, waiter.filter)) {
          waiters.splice(i, 1);
          waiter.resolve(sms);
          break;
        }
      }

      if (waiters.length === 0) {
        this.waiters.delete(sms.to);
        this.stopPolling(sms.to);
      }
    }
  }

  /**
   * Start polling the API server for new SMS notifications.
   */
  private startPolling(phoneNumber: string): void {
    // Don't start if already polling
    if (this.pollingTimers.has(phoneNumber)) return;

    const poll = async () => {
      try {
        const notifications = this.notificationPoller
          ? await this.notificationPoller(phoneNumber)
          : await this.fetchNotifications(phoneNumber);

        for (const sms of notifications) {
          this.handleIncomingSms(sms);
        }
      } catch (error) {
        console.error(
          `[TwilioSmsService] Polling error for ${phoneNumber}:`,
          error,
        );
      }
    };

    // Poll immediately, then on interval
    void poll();
    const timer = setInterval(() => void poll(), this.pollingInterval);
    this.pollingTimers.set(phoneNumber, timer);
  }

  /**
   * Stop polling for a phone number.
   */
  private stopPolling(phoneNumber: string): void {
    const timer = this.pollingTimers.get(phoneNumber);
    if (timer) {
      clearInterval(timer);
      this.pollingTimers.delete(phoneNumber);
    }
  }

  /**
   * Fetch SMS notifications from API server.
   */
  private async fetchNotifications(
    phoneNumber: string,
  ): Promise<SmsMessage[]> {
    const url = `${this.apiBaseUrl}/webhook/sms-notifications/${encodeURIComponent(phoneNumber)}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch SMS notifications: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as { notifications: SmsMessage[] };
    return data.notifications;
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
   * Cleanup old messages (keep only last 5 minutes).
   */
  private cleanupOldMessages(phoneNumber: string): void {
    const messages = this.smsInbox.get(phoneNumber);
    if (!messages) return;

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recent = messages.filter(
      (msg) => new Date(msg.received_at) > fiveMinutesAgo,
    );

    this.smsInbox.set(phoneNumber, recent);
  }

  /**
   * Cleanup resources on shutdown.
   */
  shutdown(): void {
    // Stop all polling timers
    for (const timer of this.pollingTimers.values()) {
      clearInterval(timer);
    }
    this.pollingTimers.clear();
  }
}
