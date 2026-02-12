# Email Service Architecture

## Overview

AgentPass Email Service забезпечує кожного AI агента унікальною email адресою для автономної реєстрації на сервісах.

**Domain:** `agent-mail.xyz`
**Example:** `my-agent@agent-mail.xyz`

---

## How It Works

```
1. Agent створюється → отримує email: my-agent@agent-mail.xyz

2. Agent реєструється на GitHub → GitHub надсилає verification email

3. Email приходить на agent-mail.xyz → Cloudflare Email Routing

4. Cloudflare Worker отримує email → зберігає в Durable Object

5. Worker надсилає webhook → API Server → зберігає notification

6. MCP Server poll-ить API → отримує нотифікацію про новий email

7. MCP Server звертається до Worker → отримує повний email

8. Agent витягує verification link → кликає → реєстрація завершена ✅
```

---

## Architecture Diagram

```
External Service (GitHub, Twitter, etc.)
  │
  │ sends: "Verify your email"
  ↓
📧 Email: my-agent@agent-mail.xyz
  │
  ↓
Cloudflare Email Routing
  │ (catch-all: *@agent-mail.xyz)
  ↓
☁️ Email Worker (Cloudflare)
  │
  ├─→ Store in Durable Objects
  │   └─ Persistent storage per mailbox
  │
  └─→ Webhook notification
       │
       ↓
🌐 API Server (api.agentpass.space)
  │
  ├─→ Store notification in SQLite
  │   └─ email_notifications table
  │
  └─→ MCP Server polls for updates
       │
       ↓
🤖 MCP Server (local)
  │
  ├─→ GET /webhook/email-notifications/my-agent@agent-mail.xyz
  │   └─ "New email arrived!"
  │
  └─→ GET email.agent-mail.xyz/emails/my-agent@agent-mail.xyz/{id}
       │
       └─ Full email with HTML, body, headers
            │
            ↓
       🔗 Extract verification link
            │
            ↓
       ✅ Agent clicks link → Verified!
```

---

## Components

### 1. **Cloudflare Email Worker** (`packages/email-service/src/worker.ts`)

**Responsibilities:**
- Receive ALL incoming emails to `*@agent-mail.xyz`
- Parse MIME content (plain text + HTML)
- Store emails in Durable Objects (persistent storage)
- Send webhook to API Server
- Provide HTTP API for retrieving emails

**Endpoints:**
- `GET /emails/:address` — list all emails
- `GET /emails/:address/:id` — get specific email
- `DELETE /emails/:address/:id` — delete email
- `POST /test-email` — test endpoint (dev only)

**Storage:** Durable Objects (one per email address)

### 2. **API Server Webhook** (`packages/api-server/src/routes/webhooks.ts`)

**Responsibilities:**
- Receive webhook from Email Worker
- Store notification in `email_notifications` table
- Allow MCP Server to poll for new emails

**Endpoints:**
- `POST /webhook/email-received` — called by worker
- `GET /webhook/email-notifications/:address` — poll for new emails

**Database:**
```sql
CREATE TABLE email_notifications (
  email_id     TEXT PRIMARY KEY,
  recipient    TEXT NOT NULL,
  sender       TEXT NOT NULL,
  subject      TEXT NOT NULL,
  received_at  TEXT NOT NULL,
  notified_at  TEXT NOT NULL,
  retrieved_at TEXT          -- NULL until MCP polls
);
```

### 3. **Cloudflare Email Client** (`packages/email-service/src/cloudflare-client.ts`)

**Responsibilities:**
- TypeScript client for MCP Server
- Retrieve emails from Worker API
- Extract verification links and OTP codes
- Wait for emails with polling

**Usage in MCP Server:**
```typescript
import { CloudflareEmailClient } from '@agentpass/email-service';

const client = new CloudflareEmailClient('https://email.agent-mail.xyz');

// Wait for verification email
const email = await client.waitForEmail(
  'my-agent@agent-mail.xyz',
  { from: 'github.com', subject: 'Verify' },
  60_000 // 60 sec timeout
);

// Extract link
const link = client.extractVerificationLink(email);
// → "https://github.com/verify?token=abc123..."
```

### 4. **Local EmailStore** (`packages/email-service/src/email-store.ts`)

**Responsibilities:**
- In-memory email storage for testing
- Same API as CloudflareEmailClient
- Used in development and unit tests

---

## Deployment

### Production Setup

1. **Configure domain in Cloudflare**
   - Add `agent-mail.xyz` to Cloudflare
   - Enable Email Routing
   - Add catch-all rule: `*@agent-mail.xyz` → Worker

2. **Deploy Email Worker**
   ```bash
   cd packages/email-service
   wrangler secret put WEBHOOK_SECRET
   wrangler secret put API_SERVER_URL
   pnpm build
   wrangler deploy --env production
   ```

3. **Configure API Server**
   ```bash
   export WEBHOOK_SECRET="<same-as-worker>"
   # Restart API server
   ```

4. **Test email flow**
   ```bash
   # Send test email via Cloudflare
   # Check worker logs
   wrangler tail

   # Verify email stored
   curl https://email.agent-mail.xyz/emails/test@agent-mail.xyz
   ```

### Local Development

```bash
# Terminal 1: API Server
cd packages/api-server
pnpm dev

# Terminal 2: Email Worker
cd packages/email-service
wrangler dev

# Terminal 3: Send test email
./test-email.sh my-agent@agent-mail.xyz
```

---

## Email Parsing Features

### Verification Links

Automatically extracts links containing keywords:
- `verify` / `verification`
- `confirm` / `confirmation`
- `activate` / `activation`
- `token`
- `auth` / `callback`

**Example:**
```typescript
const link = client.extractVerificationLink(email);
// Input: "Click here: https://github.com/verify?code=abc123"
// Output: "https://github.com/verify?code=abc123"
```

### OTP Codes

Extracts 4-8 digit codes from patterns:
- `code: 123456`
- `Your OTP is 7890`
- `verification code is: 12345678`

**Example:**
```typescript
const otp = client.extractOtpCode(email);
// Input: "Your verification code is: 482910"
// Output: "482910"
```

---

## Security

### Webhook Authentication

Email Worker → API Server webhook secured with:
- `X-Webhook-Secret` header
- Shared secret between worker and API
- API rejects requests without valid secret

### No Email Creation API

Agents **cannot** create arbitrary email addresses. Each agent gets ONE address:
- Generated from agent name: `sanitize(agent.name)@agent-mail.xyz`
- Lowercase alphanumeric + hyphens only
- Validated on generation

### Data Isolation

- Each mailbox stored in separate Durable Object
- No cross-mailbox access
- Emails can be deleted individually

---

## Limitations & Considerations

### Catch-All Routing

**Pro:** No need to pre-create mailboxes
**Con:** Anyone can send to any `*@agent-mail.xyz`

**Mitigation:**
- Agent names are unique (tied to passport ID)
- MCP Server only polls for known agent addresses
- Spam filtering via Cloudflare Email Security

### Email Delivery Time

- Typical latency: 1-5 seconds
- MCP Server polling interval: 1 second
- Total wait time for verification: 2-10 seconds

### Storage Limits

Durable Objects limits per mailbox:
- **Storage:** 50 MB per Durable Object
- **Requests:** Unlimited
- **Retention:** Indefinite (until manually deleted)

**Best practice:** Delete emails after processing

---

## Future Enhancements

### WebSocket / SSE for Real-Time Delivery

Instead of polling, push notifications:

```typescript
// MCP Server establishes WebSocket
const ws = new WebSocket('wss://api.agentpass.space/ws');

// API Server pushes on email arrival
ws.on('email.received', (notification) => {
  const email = await client.getEmail(notification.address, notification.id);
  // Process immediately
});
```

### Email Sending

Allow agents to send emails:

```typescript
await client.sendEmail({
  from: 'my-agent@agent-mail.xyz',
  to: 'customer@example.com',
  subject: 'Response from AI Agent',
  body: '...'
});
```

**Implementation:** Cloudflare Email Workers can send via API

### Attachment Support

Currently: text/html only
Future: parse and store attachments (PDFs, images)

---

## Troubleshooting

### Emails not arriving

1. Check Email Routing enabled in Cloudflare
2. Verify catch-all rule configured
3. Test with Cloudflare Email Testing tool
4. Check worker logs: `wrangler tail`

### Webhook not working

1. Verify `WEBHOOK_SECRET` matches
2. Check API server reachable from Cloudflare
3. Test manually:
   ```bash
   curl -X POST https://api.agentpass.space/webhook/email-received \
     -H "X-Webhook-Secret: your-secret" \
     -d '{"email_id":"test","to":"test@agent-mail.xyz",...}'
   ```

### MCP Server not receiving emails

1. Check polling endpoint:
   ```bash
   curl https://api.agentpass.space/webhook/email-notifications/my-agent@agent-mail.xyz
   ```
2. Verify notifications in database
3. Check MCP server logs

---

## Costs

### Cloudflare Email Workers

- **Email Routing:** FREE (unlimited)
- **Workers:** FREE tier: 100k requests/day
- **Durable Objects:** $0.15/million requests

**Estimated cost for 1000 agents:**
- 1000 emails/day = FREE
- Storage: ~50 MB = FREE
- Webhook calls: 1000/day = FREE

**Conclusion:** Effectively FREE for MVP and early scale

