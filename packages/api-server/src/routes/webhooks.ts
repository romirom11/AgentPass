/**
 * Webhook routes for receiving events from external services.
 *
 * Includes email-received webhook from Cloudflare Email Worker and
 * SMS-received webhook from Twilio.
 */

import { Hono } from 'hono';
import type { Client } from '@libsql/client';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'utf-8'), Buffer.from(b, 'utf-8'));
}

export function createWebhookRouter(db: Client): Hono {
  const app = new Hono();

  /**
   * POST /webhook/email-received
   *
   * Called by Cloudflare Email Worker when a new email arrives.
   * Stores a notification record for real-time polling by MCP server.
   */
  app.post('/email-received', async (c) => {
    // Verify webhook secret (fail closed)
    const secret = c.req.header('X-Webhook-Secret');
    const expectedSecret = process.env.WEBHOOK_SECRET;

    if (!expectedSecret) {
      console.error('WEBHOOK_SECRET not configured - rejecting webhook');
      return c.json({ error: 'Server misconfiguration', code: 'CONFIG_ERROR' }, 500);
    }

    if (!secret || !constantTimeCompare(secret, expectedSecret)) {
      return c.json({ error: 'Invalid webhook secret', code: 'AUTH_FAILED' }, 401);
    }

    // Parse webhook payload
    const payload = await c.req.json<EmailWebhookPayload>();

    // Validate required fields
    if (!payload.email_id || !payload.to || !payload.from) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Store notification for MCP server to poll
    await db.execute({
      sql: `
        INSERT INTO email_notifications (email_id, recipient, sender, subject, received_at, notified_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [
        payload.email_id,
        payload.to.toLowerCase(),
        payload.from.toLowerCase(),
        payload.subject || '(no subject)',
        payload.received_at,
        new Date().toISOString(),
      ],
    });

    // TODO: In future, notify via WebSocket or SSE to MCP servers
    // For now, MCP server will poll GET /webhook/email-notifications/:address

    return c.json({ ok: true });
  });

  /**
   * GET /webhook/email-notifications/:address
   *
   * Poll for new email notifications for a specific address.
   * Returns list of pending notifications and marks them as retrieved.
   */
  app.get('/email-notifications/:address', async (c) => {
    const address = c.req.param('address').toLowerCase();

    // Get all unprocessed notifications for this address
    const result = await db.execute({
      sql: `
        SELECT email_id, recipient, sender, subject, received_at, notified_at
        FROM email_notifications
        WHERE recipient = ? AND retrieved_at IS NULL
        ORDER BY received_at DESC
        LIMIT 50
      `,
      args: [address],
    });

    const notifications = result.rows.map((row) => ({
      email_id: row.email_id as string,
      recipient: row.recipient as string,
      sender: row.sender as string,
      subject: row.subject as string,
      received_at: row.received_at as string,
      notified_at: row.notified_at as string,
    }));

    // Mark as retrieved
    if (notifications.length > 0) {
      const emailIds = notifications.map((n) => n.email_id);
      // Safe: placeholders are generated from array length, not user input
      // Each placeholder is '?' and values are passed via parameterized args
      const placeholders = emailIds.map(() => '?').join(',');

      await db.execute({
        sql: `
          UPDATE email_notifications
          SET retrieved_at = ?
          WHERE email_id IN (${placeholders})
        `,
        args: [new Date().toISOString(), ...emailIds],
      });
    }

    return c.json({ notifications });
  });

  /**
   * POST /webhook/sms-received
   *
   * Called by Twilio when a new SMS arrives.
   * Validates Twilio signature and stores notification for MCP server polling.
   */
  app.post('/sms-received', async (c) => {
    // Verify webhook secret (fail closed)
    const webhookSecret = c.req.header('X-Webhook-Secret');
    const expectedWebhookSecret = process.env.WEBHOOK_SECRET;

    if (!expectedWebhookSecret) {
      console.error('WEBHOOK_SECRET not configured - rejecting webhook');
      return c.text('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', 500, {
        'Content-Type': 'text/xml',
      });
    }

    if (!webhookSecret || !constantTimeCompare(webhookSecret, expectedWebhookSecret)) {
      return c.text('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', 401, {
        'Content-Type': 'text/xml',
      });
    }

    // Parse Twilio form data ONCE to avoid stream consumption issues
    const formData = await c.req.parseBody();

    // Get Twilio auth token for signature validation
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (authToken) {
      // Validate Twilio signature
      const signature = c.req.header('X-Twilio-Signature');
      if (!signature || !validateTwilioSignature(c.req.url, formData, signature, authToken)) {
        console.warn('[SMS Webhook] Invalid Twilio signature');
        return c.text('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', 400, {
          'Content-Type': 'text/xml',
        });
      }
    } else {
      console.warn('TWILIO_AUTH_TOKEN not configured - skipping Twilio signature validation (webhook secret validated)');
    }
    const messageSid = formData.MessageSid as string;
    const from = formData.From as string;
    const to = formData.To as string;
    const body = formData.Body as string;

    // Validate required fields
    if (!messageSid || !from || !to) {
      console.error('[SMS Webhook] Missing required fields:', { messageSid, from, to });
      return c.text('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', 400, {
        'Content-Type': 'text/xml',
      });
    }

    const receivedAt = new Date().toISOString();

    // Store notification for MCP server to poll
    try {
      await db.execute({
        sql: `
          INSERT INTO sms_notifications (sms_id, phone_number, sender, body, received_at, notified_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        args: [
          messageSid,
          to,
          from,
          body || '',
          receivedAt,
          receivedAt,
        ],
      });

      console.log(`[SMS Webhook] Stored SMS ${messageSid} for ${to}`);
    } catch (error) {
      console.error('[SMS Webhook] Failed to store notification:', error);
      return c.text('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', 500, {
        'Content-Type': 'text/xml',
      });
    }

    // Return TwiML response (empty response = no reply)
    return c.text('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', 200, {
      'Content-Type': 'text/xml',
    });
  });

  /**
   * GET /webhook/sms-notifications/:phoneNumber
   *
   * Poll for new SMS notifications for a specific phone number.
   * Returns list of pending notifications and marks them as retrieved.
   */
  app.get('/sms-notifications/:phoneNumber', async (c) => {
    const phoneNumber = c.req.param('phoneNumber');

    // Get all unprocessed notifications for this phone number
    const result = await db.execute({
      sql: `
        SELECT sms_id, phone_number, sender, body, received_at, notified_at
        FROM sms_notifications
        WHERE phone_number = ? AND retrieved_at IS NULL
        ORDER BY received_at DESC
        LIMIT 50
      `,
      args: [phoneNumber],
    });

    const notifications = result.rows.map((row) => ({
      id: row.sms_id as string,
      to: row.phone_number as string,
      from: row.sender as string,
      body: row.body as string,
      received_at: row.received_at as string,
    }));

    // Mark as retrieved
    if (notifications.length > 0) {
      const smsIds = notifications.map((n) => n.id);
      // Safe: placeholders are generated from array length, not user input
      // Each placeholder is '?' and values are passed via parameterized args
      const placeholders = smsIds.map(() => '?').join(',');

      await db.execute({
        sql: `
          UPDATE sms_notifications
          SET retrieved_at = ?
          WHERE sms_id IN (${placeholders})
        `,
        args: [new Date().toISOString(), ...smsIds],
      });
    }

    return c.json({ notifications });
  });

  return app;
}

interface EmailWebhookPayload {
  email_id: string;
  to: string;
  from: string;
  subject?: string;
  received_at: string;
}

/**
 * Validate Twilio webhook signature.
 *
 * See: https://www.twilio.com/docs/usage/security#validating-requests
 */
function validateTwilioSignature(
  url: string,
  params: Record<string, string | File>,
  signature: string,
  authToken: string,
): boolean {
  // Build the data string: URL + sorted params
  const data = url + Object.keys(params).sort().map(key => {
    const value = params[key];
    return `${key}${typeof value === 'string' ? value : ''}`;
  }).join('');

  // Compute HMAC-SHA1
  const expectedSignature = createHmac('sha1', authToken)
    .update(Buffer.from(data, 'utf-8'))
    .digest('base64');

  // Use constant-time comparison to prevent timing attacks
  return constantTimeCompare(expectedSignature, signature);
}
