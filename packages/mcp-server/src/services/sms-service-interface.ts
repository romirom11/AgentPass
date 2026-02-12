/**
 * SMS service interface that both mock and real Twilio implementations follow.
 */

export interface SmsMessage {
  id: string;
  to: string;
  from: string;
  body: string;
  received_at: string;
}

export interface SmsFilter {
  from?: string;
  bodyContains?: string;
  after?: Date;
}

export interface SmsServiceInterface {
  /**
   * Get (or provision) a phone number for the given agent/passport.
   * Returns the same number on repeated calls with the same ID.
   */
  getPhoneNumber(passportId: string): Promise<string>;

  /**
   * Release a phone number back to the pool (if applicable).
   * Mock implementation is a no-op; Twilio implementation returns to pool.
   */
  releasePhoneNumber(passportId: string): Promise<void>;

  /**
   * Wait for an SMS to arrive at the given phone number.
   * Optionally filter by sender, body content, or timestamp.
   * Rejects if timeout is reached without receiving a matching SMS.
   */
  waitForSms(
    phoneNumber: string,
    filter?: SmsFilter,
    timeoutMs?: number,
  ): Promise<SmsMessage>;

  /**
   * Extract a 4-8 digit OTP code from an SMS message.
   * Returns the OTP if found, null otherwise.
   */
  extractOtpFromSms(smsBody: string): string | null;
}
