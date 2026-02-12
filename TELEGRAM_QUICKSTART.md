# Telegram Bot - Quick Start Guide

Get your AgentPass Telegram bot up and running in 5 minutes.

## Prerequisites

- Node.js 22+
- pnpm 10+
- A Telegram account

## Step 1: Create Your Bot (2 minutes)

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` to BotFather
3. Choose a name: `AgentPass Bot` (or anything you like)
4. Choose a username: `@YourAgentPass_bot` (must end with "bot")
5. Copy the token that BotFather gives you

Example token: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

## Step 2: Configure Environment (30 seconds)

```bash
# Add to your shell profile (~/.bashrc, ~/.zshrc, etc.)
export TELEGRAM_BOT_TOKEN="your_token_from_botfather"
export TELEGRAM_BOT_USERNAME="YourAgentPass_bot"

# Or create a .env file (if using dotenv)
echo 'TELEGRAM_BOT_TOKEN=your_token_from_botfather' >> .env
echo 'TELEGRAM_BOT_USERNAME=YourAgentPass_bot' >> .env

# Reload your shell
source ~/.bashrc  # or source ~/.zshrc
```

## Step 3: Start the MCP Server (1 minute)

```bash
cd packages/mcp-server
pnpm install
pnpm build
pnpm start
```

You should see:
```
[TelegramBot] Started in polling mode
AgentPass MCP Server running...
```

## Step 4: Link Your Account (1 minute)

1. Open Telegram
2. Search for your bot (`@YourAgentPass_bot`)
3. Click "Start" or send `/start`
4. Send `/link your@email.com`

You'll receive a confirmation message:
```
✅ Account Linked

Email: your@email.com
Chat ID: 123456789

You'll now receive notifications for your AI agents.
```

## Step 5: Test It! (30 seconds)

Run the example script:

```bash
cd packages/mcp-server
pnpm tsx examples/telegram-bot-example.ts
```

You should receive several test notifications in Telegram:
- 🤖 Approval request
- 🧩 CAPTCHA alert
- ⚠️ Error notification
- ✅ Registration success
- 🔐 Login success

## Verify It Works

Send `/status` to your bot in Telegram:

```
📊 Account Status

Linked Email: your@email.com
Chat ID: 123456789
Total Notifications: 5

Your agents are connected and ready! 🚀
```

## Common Issues

### "TELEGRAM_BOT_TOKEN not set"

**Problem**: Environment variable not loaded

**Solution**:
```bash
# Check if it's set
echo $TELEGRAM_BOT_TOKEN

# If empty, set it again
export TELEGRAM_BOT_TOKEN="your_token_here"

# Restart the MCP server
```

### Bot doesn't respond to commands

**Problem**: Bot might be stopped or blocked

**Solution**:
1. Check BotFather: send `/mybots` → select your bot → ensure it's not deleted
2. Check server logs for errors
3. Try `/start` again

### No notifications received

**Problem**: Account not linked

**Solution**:
1. Send `/status` to check if linked
2. If not, send `/link your@email.com` again
3. Ensure email matches exactly what you use in the example

## Next Steps

Now that your bot is running:

1. **Read the full documentation**: [TELEGRAM.md](packages/mcp-server/TELEGRAM.md)
2. **Integrate into your app**: See [API Integration Guide](packages/mcp-server/TELEGRAM.md#api-integration)
3. **Deploy to production**: See [Production Deployment](packages/mcp-server/TELEGRAM.md#production-deployment)

## Quick Reference

### Bot Commands
- `/start` — Welcome and setup
- `/link <email>` — Link account
- `/status` — Show account info
- `/help` — List commands

### Notification Types
- 🤖 Approval requests (with [Approve] [Deny] buttons)
- 🧩 CAPTCHA alerts (with [Open Dashboard] [Skip] buttons)
- ⚠️ Errors (with [Retry] [Skip] buttons)
- ✅ Registration success
- 🔐 Login success

### Environment Variables
```bash
TELEGRAM_BOT_TOKEN="your_token_here"        # Required
TELEGRAM_BOT_USERNAME="YourAgentPass_bot"   # Optional
```

### API Endpoints
```bash
# Generate deep link for account linking
GET /telegram/link/:email

# Check bot status
GET /telegram/status

# Webhook endpoint (production)
POST /telegram/webhook
```

## Help & Support

- **Documentation**: [packages/mcp-server/TELEGRAM.md](packages/mcp-server/TELEGRAM.md)
- **Example Code**: [packages/mcp-server/examples/telegram-bot-example.ts](packages/mcp-server/examples/telegram-bot-example.ts)
- **Tests**: Run `pnpm test` to verify everything works
- **grammY Docs**: https://grammy.dev/
- **Telegram Bot API**: https://core.telegram.org/bots/api

---

**That's it!** Your Telegram bot is now ready to send real-time notifications to your AI agent owners. 🚀
