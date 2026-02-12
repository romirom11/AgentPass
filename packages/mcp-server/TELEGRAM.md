# Telegram Bot Integration

AgentPass includes a production-ready Telegram bot for real-time notifications to agent owners. The bot is built using the [grammY](https://grammy.dev/) framework.

## Features

- **Account Linking**: Link your Telegram account to receive notifications
- **Approval Requests**: Approve or deny agent actions via inline buttons
- **CAPTCHA Alerts**: Get notified when agents encounter CAPTCHAs
- **Error Notifications**: Receive error alerts with retry/skip options
- **Registration & Login Notifications**: Track agent activity in real-time
- **Bot Commands**: `/start`, `/link`, `/status`, `/help`

## Setup

### 1. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the prompts
3. Choose a name (e.g., "AgentPass Bot")
4. Choose a username (e.g., `@AgentPass_bot`)
5. Copy the bot token provided by BotFather

### 2. Configure Environment Variables

```bash
# Required: Bot token from BotFather
export TELEGRAM_BOT_TOKEN="your_bot_token_here"

# Optional: Bot username (defaults to "AgentPass_bot")
export TELEGRAM_BOT_USERNAME="AgentPass_bot"
```

### 3. Start the MCP Server

The Telegram bot starts automatically when you run the MCP server:

```bash
pnpm build
pnpm start
```

You should see:
```
[TelegramBot] Started in polling mode
```

If the token is not set, you'll see:
```
[TelegramBot] TELEGRAM_BOT_TOKEN not set — Telegram notifications disabled
```

## Usage

### Linking Your Account

1. Open Telegram and search for your bot (e.g., `@AgentPass_bot`)
2. Send `/start` to see the welcome message
3. Send `/link your@email.com` to link your account
4. You'll receive a confirmation message

Alternatively, use the API to get a deep link:

```bash
curl http://localhost:3846/telegram/link/your@email.com
```

Response:
```json
{
  "email": "your@email.com",
  "link": "https://t.me/AgentPass_bot?start=link_your@email.com",
  "instructions": "Click the link to open Telegram..."
}
```

### Bot Commands

- `/start` — Welcome message and setup instructions
- `/link <email>` — Link this chat to your AgentPass account
- `/status` — View your linked account and agent activity
- `/help` — List available commands

### Receiving Notifications

Once linked, you'll receive notifications for:

#### Approval Requests
```
🤖 Approval Required

Agent: KDN Sales Bot (ap_7xk2m9f3)
Action: register
service: github.com
Timestamp: 2/12/2026, 4:30:15 PM

Approve this action?
[✅ Approve] [❌ Deny]
```

#### CAPTCHA Detection
```
🧩 CAPTCHA Detected

Agent: KDN Sales Bot (ap_7xk2m9f3)
Service: twitter.com
Type: reCAPTCHA v2
Timestamp: 2/12/2026, 4:30:15 PM

Agent needs your help to continue.
[🖥 Open Dashboard] [⏭ Skip]
```

#### Errors
```
⚠️ Authentication Failed

Agent: KDN Sales Bot (ap_7xk2m9f3)
Service: github.com
Error: Login failed: invalid credentials
Timestamp: 2/12/2026, 4:30:15 PM

What would you like to do?
[🔄 Retry] [⏭ Skip]
```

#### Registration Success
```
✅ New Registration

Agent: KDN Sales Bot (ap_7xk2m9f3)
Service: github.com
Method: Native (AgentPass SDK)
Duration: 34.5s
Timestamp: 2/12/2026, 4:30:15 PM
```

#### Login Success
```
🔐 Login Success

Agent: KDN Sales Bot (ap_7xk2m9f3)
Service: github.com
Timestamp: 2/12/2026, 4:30:15 PM
```

## API Integration

### Sending Notifications from Code

```typescript
import { TelegramBotService } from "./services/telegram-bot.js";
import { ApprovalService } from "./services/approval-service.js";
import { WebhookService } from "./services/webhook-service.js";

// Initialize services
const webhookService = new WebhookService();
const approvalService = new ApprovalService(webhookService);
const telegramBot = new TelegramBotService({ approvalService });

// Link an owner's email to their Telegram chat
telegramBot.setChatId("owner@example.com", "chat_123456789");

// Send an approval request
await telegramBot.notifyApprovalNeeded(
  "owner@example.com",
  "MyAgent",
  "ap_abc123",
  "register",
  { service: "github.com", domain: "github.com" }
);

// Send a CAPTCHA alert
await telegramBot.notifyCaptchaDetected(
  "owner@example.com",
  "MyAgent",
  "ap_abc123",
  "twitter.com",
  "reCAPTCHA v2",
  screenshotBuffer // optional Buffer
);

// Send an error notification
await telegramBot.notifyError(
  "owner@example.com",
  "MyAgent",
  "ap_abc123",
  "github.com",
  "Login failed: invalid credentials"
);

// Send a registration success notification
await telegramBot.notifyRegistration(
  "owner@example.com",
  "MyAgent",
  "ap_abc123",
  "github.com",
  "native", // or "fallback"
  45.2 // duration in seconds (optional)
);

// Send a login success notification
await telegramBot.notifyLogin(
  "owner@example.com",
  "MyAgent",
  "ap_abc123",
  "github.com"
);
```

## Production Deployment

### Webhook Mode

For production, use webhook mode instead of polling:

```typescript
const telegramBot = new TelegramBotService({
  approvalService,
  mode: "webhook"
});

// Set webhook URL
await telegramBot.setWebhook("https://api.agentpass.space/telegram/webhook");
```

Then in your API server, handle webhook updates:

```typescript
// In packages/api-server/src/routes/telegram.ts
router.post("/webhook", async (c) => {
  const update = await c.req.json();

  // Forward to bot instance
  const bot = telegramBot.getBot();
  if (bot) {
    await bot.handleUpdate(update);
  }

  return c.json({ ok: true });
});
```

### Security Best Practices

1. **Never commit bot tokens** — Always use environment variables
2. **Validate webhook requests** — Verify requests come from Telegram
3. **Rate limiting** — Implement rate limiting on webhook endpoints
4. **HTTPS only** — Telegram webhooks require HTTPS
5. **Secret token** — Use webhook secret token for additional security

```typescript
// Set webhook with secret token
await bot.api.setWebhook("https://api.agentpass.space/telegram/webhook", {
  secret_token: process.env.TELEGRAM_WEBHOOK_SECRET
});
```

## Architecture

```
┌─────────────────┐
│  Telegram Bot   │
│   (grammY)      │
└────────┬────────┘
         │
         ├── Commands (/start, /link, /status, /help)
         │
         ├── Callback Handlers (approve, deny, retry, skip)
         │
         └── Notifications
             ├── Approval Requests
             ├── CAPTCHA Alerts
             ├── Error Notifications
             ├── Registration Success
             └── Login Success
```

### Service Dependencies

- `TelegramBotService` — Main bot service (grammY)
- `ApprovalService` — Handles approval requests
- `WebhookService` — Emits events to webhooks
- `MCP Server` — Initializes and manages bot lifecycle

## Testing

Run the test suite:

```bash
pnpm test src/services/telegram-bot.test.ts
```

The bot gracefully handles missing tokens in tests:

```typescript
import { TelegramBotService } from "./telegram-bot.js";

const bot = new TelegramBotService(); // No token = disabled mode
expect(bot.isEnabled()).toBe(false);
```

## Troubleshooting

### Bot Not Starting

**Problem**: Bot doesn't start or shows "TELEGRAM_BOT_TOKEN not set"

**Solution**: Ensure environment variable is set:
```bash
echo $TELEGRAM_BOT_TOKEN
# Should output your token
```

### Commands Not Working

**Problem**: Bot doesn't respond to `/start` or `/link`

**Solution**:
1. Check bot is running: look for "[TelegramBot] Started in polling mode"
2. Verify bot username matches your actual bot
3. Check bot has permission to receive messages (check with @BotFather)

### Notifications Not Received

**Problem**: Owner doesn't receive notifications

**Solution**:
1. Verify account is linked: send `/status` to the bot
2. Check owner email matches exactly (case-sensitive)
3. Look for warnings in server logs

### Webhook Not Working

**Problem**: Webhook mode not receiving updates

**Solution**:
1. Verify HTTPS is enabled (Telegram requires HTTPS)
2. Check webhook URL is accessible from internet
3. Verify webhook is set: `curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
4. Check server logs for incoming webhook requests

## Resources

- [grammY Documentation](https://grammy.dev/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [BotFather Commands](https://core.telegram.org/bots#6-botfather)
- [Telegram Bot Best Practices](https://core.telegram.org/bots/webhooks)

## Future Enhancements

- [ ] Rich media attachments (screenshots, PDFs)
- [ ] Inline query support
- [ ] Group chat notifications
- [ ] Custom notification preferences per owner
- [ ] Multi-language support
- [ ] Activity analytics and reports
