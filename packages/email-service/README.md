# AgentPass Email Service

Email infrastructure for AI agents via Cloudflare Email Workers.

## Overview

This package provides:
- **Cloudflare Email Worker** — receives all emails sent to `*@agentpass.dev`
- **Durable Objects** — stores emails per mailbox
- **HTTP API** — allows MCP server to retrieve emails
- **Local EmailStore** — in-memory implementation for testing

## Architecture

```
External service (GitHub, Twitter, etc.)
  │
  │ sends email to agent@agentpass.dev
  ↓
Cloudflare Email Routing (catch-all: *@agentpass.dev)
  │
  ↓
Email Worker (worker.ts)
  │
  ├─→ Store in Durable Objects
  │
  └─→ Webhook to API Server → /webhook/email-received
       │
       └─→ MCP Server polls → /webhook/email-notifications/:address
            │
            └─→ Agent retrieves full email from worker
```

## Setup

### 1. Prerequisites

- Cloudflare account with Workers enabled
- Domain configured in Cloudflare DNS (e.g., `agentpass.dev`)
- Wrangler CLI: `npm install -g wrangler`

### 2. Configure Domain Email Routing

1. Go to Cloudflare Dashboard → Email → Email Routing
2. Enable Email Routing for your domain
3. Add a **Catch-All Address** rule:
   - Pattern: `*@agentpass.dev`
   - Action: **Send to Worker**
   - Worker: `agentpass-email-worker` (you'll deploy this next)

### 3. Set Environment Variables

Create `.dev.vars` for local development:

```bash
# packages/email-service/.dev.vars
API_SERVER_URL=http://localhost:3846
WEBHOOK_SECRET=your-secret-key-here
```

For production, set secrets via Wrangler:

```bash
cd packages/email-service

# Set production API URL
wrangler secret put API_SERVER_URL
# Enter: https://api.agentpass.dev

# Set webhook secret
wrangler secret put WEBHOOK_SECRET
# Enter: <generate a strong random key>
```

### 4. Deploy Email Worker

```bash
cd packages/email-service

# Build TypeScript
pnpm build

# Deploy to Cloudflare
wrangler deploy

# Or deploy to production environment
wrangler deploy --env production
```

### 5. Configure API Server

Set the same webhook secret in your API server:

```bash
cd packages/api-server

# Set environment variable
export WEBHOOK_SECRET="<same-secret-as-worker>"

# Or in production deployment (Railway, Render, etc.)
# Add WEBHOOK_SECRET as environment variable
```

## Usage

### Creating Agent Email Address

Each agent gets a unique email address based on their name:

```typescript
import { generateEmailAddress } from '@agentpass/email-service';

const email = generateEmailAddress('my-agent');
// → "my-agent@agentpass.dev"
```

### Retrieving Emails (Production)

Use `CloudflareEmailClient` to retrieve emails from the worker:

```typescript
import { CloudflareEmailClient } from '@agentpass/email-service';

const client = new CloudflareEmailClient('https://email.agentpass.dev');

// List all emails for an address
const emails = await client.listEmails('my-agent@agentpass.dev');

// Wait for a specific email
const email = await client.waitForEmail(
  'my-agent@agentpass.dev',
  { from: 'github.com', subject: 'Verify' },
  60_000 // 60 sec timeout
);

// Extract verification link
const link = client.extractVerificationLink(email);
// → "https://github.com/verify?token=abc123..."

// Extract OTP code
const otp = client.extractOtpCode(email);
// → "482910"
```

### Testing Locally

Use `EmailStore` for local development:

```typescript
import { EmailStore } from '@agentpass/email-service';

const store = new EmailStore();

// Simulate receiving an email
store.addEmail({
  id: 'test-email-1',
  to: 'my-agent@agentpass.dev',
  from: 'github@email.github.com',
  subject: 'Verify your email',
  body: 'Click here to verify: https://github.com/verify?token=abc123',
  received_at: new Date().toISOString(),
});

// Agent waits for email
const email = await store.waitForEmail(
  'my-agent@agentpass.dev',
  { subject: 'Verify' }
);

const link = store.extractVerificationLink(email.id);
// → "https://github.com/verify?token=abc123"
```

## API Endpoints

### Worker HTTP API

**Base URL:** `https://email.agentpass.dev` (or your worker URL)

#### `GET /emails/:address`
List all emails for an address.

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "to": "my-agent@agentpass.dev",
    "from": "github@email.github.com",
    "subject": "Verify your email",
    "body": "Click here...",
    "html": "<html>...",
    "received_at": "2024-02-12T10:00:00Z"
  }
]
```

#### `GET /emails/:address/:id`
Get a specific email.

#### `DELETE /emails/:address/:id`
Delete an email.

### API Server Webhook

**Base URL:** `https://api.agentpass.dev`

#### `POST /webhook/email-received`
Called by Email Worker when new email arrives.

**Headers:**
- `X-Webhook-Secret`: Shared secret for authentication

**Body:**
```json
{
  "email_id": "550e8400-e29b-41d4-a716-446655440000",
  "to": "my-agent@agentpass.dev",
  "from": "github@email.github.com",
  "subject": "Verify your email",
  "received_at": "2024-02-12T10:00:00Z"
}
```

#### `GET /webhook/email-notifications/:address`
Poll for new email notifications (used by MCP server).

**Response:**
```json
{
  "notifications": [
    {
      "email_id": "550e8400-e29b-41d4-a716-446655440000",
      "recipient": "my-agent@agentpass.dev",
      "sender": "github@email.github.com",
      "subject": "Verify your email",
      "received_at": "2024-02-12T10:00:00Z",
      "notified_at": "2024-02-12T10:00:01Z"
    }
  ]
}
```

## Development

```bash
# Install dependencies
pnpm install

# Build TypeScript
pnpm build

# Run tests
pnpm test

# Watch mode
pnpm dev

# Local Wrangler dev server (with email simulation)
wrangler dev
```

## Testing Email Flow

### 1. Send Test Email

Use `curl` to simulate an incoming email:

```bash
curl -X POST http://localhost:8787/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "my-agent@agentpass.dev",
    "from": "test@example.com",
    "subject": "Test Email",
    "body": "This is a test email with verification link: https://example.com/verify?code=123456"
  }'
```

### 2. Retrieve Email

```bash
curl http://localhost:8787/emails/my-agent@agentpass.dev
```

## Troubleshooting

### Emails not arriving

1. Check Cloudflare Email Routing is enabled
2. Verify catch-all rule points to your worker
3. Check worker logs: `wrangler tail`
4. Test email delivery via Cloudflare Email Testing tool

### Webhook not calling API server

1. Verify `API_SERVER_URL` is set correctly
2. Check `WEBHOOK_SECRET` matches on both sides
3. Ensure API server is publicly accessible (not localhost)
4. Check API server logs for webhook errors

### Durable Objects errors

1. Ensure migrations are configured in `wrangler.toml`
2. Deploy with `wrangler deploy` (migrations run automatically)
3. Check Durable Objects are enabled in your Cloudflare account

## Production Checklist

- [ ] Domain configured in Cloudflare
- [ ] Email Routing enabled with catch-all rule
- [ ] Worker deployed: `wrangler deploy --env production`
- [ ] `API_SERVER_URL` set to production API
- [ ] `WEBHOOK_SECRET` generated and set on both worker and API server
- [ ] Test email delivery end-to-end
- [ ] Monitor worker logs for errors
- [ ] Set up alerts for failed webhook deliveries

## License

MIT
