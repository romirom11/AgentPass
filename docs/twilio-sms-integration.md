# Twilio SMS Integration Documentation

## Overview

AgentPass now includes production-ready Twilio SMS integration for SMS verification during agent registration flows. The system automatically switches between mock (development) and real Twilio (production) based on environment variables.

## Architecture

### Global SMS Service

AgentPass operates a **single Twilio account** that serves all agents. The system manages a pool of phone numbers and assigns them to agents on-demand.

**Flow:**
1. Agent requests a phone number via `get_phone_number` MCP tool
2. AgentPass assigns a number from the pool (or provisions a new one if exhausted)
3. When SMS arrives at that number, Twilio sends webhook to AgentPass API
4. AgentPass stores the SMS in the database
5. MCP server polls for new SMS and delivers it to the waiting agent

### Components

```
┌──────────────┐
│    Agent     │
│  (via MCP)   │
└──────┬───────┘
       │
       │ 1. get_phone_number
       │ 2. wait_for_sms
       │ 3. extract_otp_from_sms
       │
       ▼
┌──────────────────────────┐
│   MCP Server             │
│                          │
│  ┌────────────────────┐  │
│  │ TwilioSmsService   │  │
│  │ - Phone pool       │  │
│  │ - Assignment map   │  │
│  │ - Polling loop     │  │
│  └────────┬───────────┘  │
└───────────┼──────────────┘
            │
            │ 4. Poll for notifications
            │
            ▼
┌──────────────────────────┐
│   API Server             │
│                          │
│  ┌────────────────────┐  │
│  │ SMS Webhook Route  │  │
│  │ /webhook/sms-recv  │  │
│  └────────┬───────────┘  │
│           │              │
│  ┌────────▼───────────┐  │
│  │  sms_notifications │  │
│  │  (SQLite table)    │  │
│  └────────────────────┘  │
└───────────┬──────────────┘
            │
            │ 3. Webhook (POST)
            │
            ▼
      ┌──────────┐
      │  Twilio  │
      └──────────┘
```

## Environment Variables

### Required for Production

```bash
# Twilio Account Credentials
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here

# Phone Number Pool (comma-separated)
TWILIO_PHONE_NUMBERS=+15551234567,+15551234568,+15551234569

# AgentPass API URL (for webhook polling)
AGENTPASS_API_URL=https://api.agentpass.space
```

### Optional

```bash
# Webhook signature verification (recommended)
WEBHOOK_SECRET=your_webhook_secret_here
```

## Phone Number Pool Management

### Pool Assignment

- Each agent gets a dedicated phone number from the pool
- Numbers are assigned on first `get_phone_number` call
- Subsequent calls for the same agent return the same number
- Assignments persist until explicitly released

### Pool Exhaustion

When all numbers in the pool are assigned, the system automatically:
1. Searches for available US local numbers via Twilio API
2. Purchases a new number
3. Configures webhook URL: `{API_BASE_URL}/webhook/sms-received`
4. Adds to pool and assigns to requesting agent

### Releasing Numbers

```typescript
await smsService.releasePhoneNumber(passportId);
```

Released numbers return to the pool and become available for other agents.

## Database Schema

### SMS Notifications Table

```sql
CREATE TABLE IF NOT EXISTS sms_notifications (
  sms_id       TEXT PRIMARY KEY,        -- Twilio MessageSid
  phone_number TEXT NOT NULL,           -- Recipient number
  sender       TEXT NOT NULL,           -- Sender number
  body         TEXT NOT NULL,           -- SMS body text
  received_at  TEXT NOT NULL,           -- ISO 8601 timestamp
  notified_at  TEXT NOT NULL,           -- When webhook was received
  retrieved_at TEXT                     -- When MCP server retrieved it
);

CREATE INDEX idx_sms_notifications_phone
  ON sms_notifications(phone_number, received_at DESC);
```

## API Endpoints

### POST /webhook/sms-received

Twilio webhook endpoint. Called when SMS arrives.

**Request (Twilio form-encoded):**
```
MessageSid=SM...
From=+12025551234
To=+15551234567
Body=Your verification code is 123456
```

**Headers:**
- `X-Twilio-Signature`: HMAC-SHA1 signature for validation

**Response (TwiML):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>
```

**Signature Validation:**
```typescript
function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
  authToken: string
): boolean {
  const data = url + Object.keys(params).sort()
    .map(key => `${key}${params[key]}`)
    .join('');

  const expected = createHmac('sha1', authToken)
    .update(Buffer.from(data, 'utf-8'))
    .digest('base64');

  return expected === signature;
}
```

### GET /webhook/sms-notifications/:phoneNumber

Poll endpoint for MCP server to retrieve new SMS.

**Response:**
```json
{
  "notifications": [
    {
      "id": "SM...",
      "to": "+15551234567",
      "from": "+12025551234",
      "body": "Your verification code is 123456",
      "received_at": "2026-02-12T10:30:00Z"
    }
  ]
}
```

**Behavior:**
- Returns all unprocessed SMS for the given phone number
- Marks returned SMS as `retrieved_at = NOW()`
- Subsequent calls won't return the same SMS

## MCP Tools

### get_phone_number

Get a phone number for the agent.

**Input:**
```json
{
  "passport_id": "ap_abc123"
}
```

**Output:**
```json
{
  "phone_number": "+15551234567"
}
```

### wait_for_sms

Wait for an SMS to arrive (with optional filtering).

**Input:**
```json
{
  "phone_number": "+15551234567",
  "timeout": 30000
}
```

**Output:**
```json
{
  "id": "SM...",
  "from": "+12025551234",
  "to": "+15551234567",
  "body": "Your verification code is 123456",
  "received_at": "2026-02-12T10:30:00Z"
}
```

**Error:**
```
Wait for SMS failed: Timed out waiting for SMS to +15551234567
```

### extract_otp_from_sms

Extract OTP code from SMS body.

**Input:**
```json
{
  "sms_body": "Your verification code is 123456"
}
```

**Output:**
```json
{
  "code": "123456"
}
```

**OTP Patterns (priority order):**
1. `(?:code|otp|pin|token|password)\s*(?:is|:)\s*(\d{4,8})` - "code is 123456"
2. `(\d{4,8})\s*(?:is your|is the)` - "123456 is your code"
3. `\b(\d{4,8})\b` - Standalone 4-8 digits

## Implementation Details

### TwilioSmsService

**Key Features:**
- Phone number pool management (assign/release)
- Automatic provisioning when pool exhausted
- Webhook-based SMS reception
- Polling loop for real-time delivery
- Message filtering (sender, body, timestamp)
- Automatic cleanup of old messages (5-minute retention)

**Polling Mechanism:**
- Default interval: 2 seconds
- Starts when `waitForSms()` is called
- Stops when SMS is received or timeout occurs
- Uses configurable notification poller function

**Message Cleanup:**
```typescript
private cleanupOldMessages(phoneNumber: string): void {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const recent = messages.filter(
    msg => new Date(msg.received_at) > fiveMinutesAgo
  );
  this.smsInbox.set(phoneNumber, recent);
}
```

### Mock SmsService

**Development Mode:**
- Generates deterministic phone numbers: `+1555XXXXXXX`
- In-memory message storage
- Same interface as TwilioSmsService
- Used when Twilio credentials not configured

**Auto-Selection:**
```typescript
function createSmsService(): SmsServiceInterface {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumbers = process.env.TWILIO_PHONE_NUMBERS;

  if (accountSid && authToken && phoneNumbers) {
    return new TwilioSmsService(...);
  }

  return new SmsService(); // Mock
}
```

## Testing

### Mock Tests (20 tests)

Located: `packages/mcp-server/src/services/sms-service.test.ts`

**Coverage:**
- Phone number provisioning (format, uniqueness, reuse)
- SMS storage and retrieval
- `waitForSms` with timeouts and existing messages
- OTP extraction with various patterns
- Filter support (sender, body, timestamp)

### Twilio Tests (21 tests)

Located: `packages/mcp-server/src/services/twilio-sms-service.test.ts`

**Coverage:**
- Phone pool initialization and assignment
- Pool exhaustion and auto-provisioning
- Number release and reuse
- Webhook SMS handling
- Polling start/stop
- Message filtering (sender, body)
- OTP extraction
- Timeout behavior

**Mocking Strategy:**
```typescript
vi.mock("twilio", () => ({
  default: vi.fn(() => ({
    availablePhoneNumbers: vi.fn(() => ({
      local: { list: vi.fn(async () => [{ phoneNumber: "+15551234567" }]) }
    })),
    incomingPhoneNumbers: {
      create: vi.fn(async ({ phoneNumber }) => ({ phoneNumber, sid: "PN..." }))
    }
  }))
}));
```

## Security

### Webhook Signature Validation

All incoming Twilio webhooks are validated using HMAC-SHA1 signature:

```typescript
const signature = c.req.header('X-Twilio-Signature');
if (!validateTwilioSignature(url, params, signature, authToken)) {
  return c.text('<Response></Response>', 400);
}
```

**Data String Construction:**
```
URL + key1 + value1 + key2 + value2 + ... (sorted by key)
```

### Credential Storage

- Twilio credentials stored in environment variables
- Never logged or exposed in error messages
- Auth token used only for API calls and signature validation

### Rate Limiting

Apply rate limiting to webhook endpoints in production:

```typescript
app.use('/webhook/sms-received', rateLimiters.webhook);
```

## Deployment

### Twilio Configuration

1. **Purchase phone numbers** via Twilio Console
2. **Configure webhook URL** for each number:
   - SMS: `https://api.agentpass.space/webhook/sms-received`
   - Method: POST
3. **Set environment variables** in deployment platform

### Webhook URL Setup (Manual)

```bash
curl -X POST https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/IncomingPhoneNumbers/{PhoneSid}.json \
  -u {AccountSid}:{AuthToken} \
  -d "SmsUrl=https://api.agentpass.space/webhook/sms-received" \
  -d "SmsMethod=POST"
```

### Webhook URL Setup (Automatic)

Phone numbers provisioned via `provisionNewNumber()` are automatically configured with the correct webhook URL.

## Monitoring

### Key Metrics

- **Pool utilization**: Active assignments / Total numbers
- **Provisioning rate**: New numbers purchased per hour
- **SMS latency**: Time from Twilio webhook to agent delivery
- **Timeout rate**: Percentage of `waitForSms` calls that timeout

### Logging

```typescript
console.log(`[TwilioSmsService] Initialized with ${poolSize} phone numbers`);
console.log(`[TwilioSmsService] Assigned ${number} to passport ${id}`);
console.log(`[TwilioSmsService] Released ${number} from passport ${id}`);
console.log(`[SMS Webhook] Stored SMS ${messageSid} for ${to}`);
```

## Troubleshooting

### "No phone numbers configured" Error

**Cause:** `TWILIO_PHONE_NUMBERS` environment variable not set or empty.

**Fix:**
```bash
export TWILIO_PHONE_NUMBERS=+15551234567,+15551234568
```

### SMS Not Received

**Checklist:**
1. Verify Twilio webhook URL is configured correctly
2. Check webhook endpoint is publicly accessible
3. Verify signature validation is passing (check API logs)
4. Confirm SMS is arriving at Twilio (check Twilio logs)
5. Check database for notification record

### Timeout Waiting for SMS

**Causes:**
1. Twilio webhook not configured
2. Network issues preventing webhook delivery
3. Signature validation failing
4. Phone number not in pool

**Debug:**
```typescript
// Check if polling is active
console.log('Active polling timers:', service.pollingTimers.size);

// Check inbox state
console.log('Inbox:', service.smsInbox.get(phoneNumber));
```

### Pool Exhaustion Issues

**Solution 1: Increase pool size**
```bash
export TWILIO_PHONE_NUMBERS=+1555...,+1555...,+1555...
```

**Solution 2: Enable auto-provisioning**
- Ensure Twilio API credentials have permission to purchase numbers
- Monitor costs (new numbers incur monthly charges)

## Cost Estimation

### Twilio Pricing (US, as of 2026)

- **Phone number**: ~$1.15/month per number
- **Incoming SMS**: $0.0075 per message
- **Outgoing SMS**: $0.0079 per message (not used)

### Example: 100 Agents

- Pool size: 10 numbers (assuming 10% concurrent usage)
- Monthly cost: 10 × $1.15 = $11.50
- SMS volume: 100 agents × 5 verifications/month × 2 SMS each = 1,000 SMS
- SMS cost: 1,000 × $0.0075 = $7.50
- **Total: ~$19/month**

### Cost Optimization

1. **Number pooling**: Share numbers across agents (implemented)
2. **Release unused numbers**: Call `releasePhoneNumber()` after verification
3. **Rate limiting**: Prevent abuse of SMS verification
4. **Caching**: Reuse verification results when safe

## Future Enhancements

### Planned Features

- [ ] **WebSocket delivery** instead of polling
- [ ] **SMS templates** for common verification flows
- [ ] **Multi-region support** (international phone numbers)
- [ ] **SMS history API** for agents
- [ ] **Analytics dashboard** for pool utilization
- [ ] **Auto-scaling pool** based on demand

### Migration to WebSockets

```typescript
// Future implementation
class TwilioSmsService {
  private wsConnections = new Map<string, WebSocket>();

  async waitForSms(phoneNumber: string): Promise<SmsMessage> {
    return new Promise((resolve) => {
      const ws = this.wsConnections.get(phoneNumber);
      ws.once('sms', resolve);
    });
  }
}
```

## References

- [Twilio SMS API Documentation](https://www.twilio.com/docs/sms)
- [Twilio Webhook Security](https://www.twilio.com/docs/usage/security#validating-requests)
- [AgentPass Architecture](./architecture.md)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
