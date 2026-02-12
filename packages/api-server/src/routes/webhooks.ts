/**
 * Webhook routes for receiving events from external services.
 *
 * Includes email-received webhook from Cloudflare Email Worker.
 */

import { Hono } from 'hono';
import type { Client } from '@libsql/client';

export function createWebhookRouter(db: Client): Hono {
  const app = new Hono();

  /**
   * POST /webhook/email-received
   *
   * Called by Cloudflare Email Worker when a new email arrives.
   * Stores a notification record for real-time polling by MCP server.
   */
  app.post('/email-received', async (c) => {
    // Verify webhook secret
    const secret = c.req.header('X-Webhook-Secret');
    const expectedSecret = process.env.WEBHOOK_SECRET;

    if (!expectedSecret) {
      console.warn('WEBHOOK_SECRET not configured - skipping verification');
    } else if (secret !== expectedSecret) {
      return c.json({ error: 'Invalid webhook secret' }, 401);
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

  return app;
}

interface EmailWebhookPayload {
  email_id: string;
  to: string;
  from: string;
  subject?: string;
  received_at: string;
}
