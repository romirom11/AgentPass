# SMS Service Setup Guide

Quick guide to configure Twilio SMS integration for AgentPass.

## Development Mode (Mock SMS)

No setup required! Just run the MCP server and it will use the mock SMS service:

```bash
cd packages/mcp-server
pnpm build
pnpm start
```

You'll see:
```
[AgentPass MCP] Using mock SMS service (development mode - set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBERS for production)
```

## Production Mode (Real Twilio)

### Step 1: Create Twilio Account

1. Sign up at [twilio.com](https://www.twilio.com/try-twilio)
2. Verify your account
3. Get your credentials from the [Console](https://console.twilio.com/):
   - Account SID (starts with `AC...`)
   - Auth Token

### Step 2: Purchase Phone Numbers

1. Go to **Phone Numbers** → **Buy a number**
2. Select **United States** (or your preferred country)
3. Choose **SMS** capability
4. Purchase at least 2-3 numbers for the pool
5. Copy the phone numbers (format: `+15551234567`)

### Step 3: Configure Webhook URLs

For each purchased number:

1. Go to **Phone Numbers** → **Manage** → **Active Numbers**
2. Click on the phone number
3. Scroll to **Messaging**
4. Set **A MESSAGE COMES IN** to:
   - **Webhook**: `https://your-api-url.com/webhook/sms-received`
   - **HTTP POST**
5. Save

### Step 4: Set Environment Variables

Create `.env` file in project root:

```bash
# Twilio Credentials
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here

# Phone Number Pool (comma-separated, no spaces)
TWILIO_PHONE_NUMBERS=+15551234567,+15551234568,+15551234569

# API Server URL (used for webhook polling)
AGENTPASS_API_URL=https://api.agentpass.space

# Optional: Webhook secret for additional security
WEBHOOK_SECRET=your_random_secret_here
```

### Step 5: Start Services

Terminal 1 - API Server:
```bash
cd packages/api-server
pnpm build
pnpm start
```

Terminal 2 - MCP Server:
```bash
cd packages/mcp-server
pnpm build
pnpm start
```

You should see:
```
[AgentPass MCP] Using Twilio SMS service (production mode)
[TwilioSmsService] Initialized with 3 phone numbers in pool
```

## Testing the Integration

### Test with MCP Tools

```json
// 1. Get phone number
{
  "tool": "get_phone_number",
  "input": {
    "passport_id": "ap_test123"
  }
}

// Response:
{
  "phone_number": "+15551234567"
}

// 2. Send test SMS to that number manually

// 3. Wait for SMS
{
  "tool": "wait_for_sms",
  "input": {
    "phone_number": "+15551234567",
    "timeout": 30000
  }
}

// Response:
{
  "id": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "from": "+12025551234",
  "to": "+15551234567",
  "body": "Your verification code is 123456",
  "received_at": "2026-02-12T10:30:00Z"
}

// 4. Extract OTP
{
  "tool": "extract_otp_from_sms",
  "input": {
    "sms_body": "Your verification code is 123456"
  }
}

// Response:
{
  "code": "123456"
}
```

### Test with curl

Send test SMS via Twilio API:

```bash
curl -X POST https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages.json \
  -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN \
  -d "From=+15551234567" \
  -d "To=+12025551234" \
  -d "Body=Test message from AgentPass"
```

Verify webhook received:

```bash
curl http://localhost:3846/webhook/sms-notifications/+15551234567
```

## Troubleshooting

### MCP server uses mock instead of Twilio

**Check:**
```bash
echo $TWILIO_ACCOUNT_SID
echo $TWILIO_AUTH_TOKEN
echo $TWILIO_PHONE_NUMBERS
```

All three must be set for Twilio mode.

### Webhook not receiving SMS

1. **Verify webhook URL is public:**
   ```bash
   curl https://your-api-url.com/webhook/sms-received
   # Should return XML response
   ```

2. **Check Twilio debugger:**
   - Go to Monitor → Logs → Errors
   - Look for webhook errors

3. **Test signature validation:**
   ```bash
   # Temporarily disable validation in webhooks.ts
   if (!authToken) {
     console.warn('Skipping validation');
   }
   ```

### "Timed out waiting for SMS"

1. Check if SMS arrived at Twilio (Console → Messaging → Logs)
2. Check API server logs for webhook calls
3. Check database for notification:
   ```sql
   SELECT * FROM sms_notifications WHERE phone_number = '+15551234567';
   ```
4. Increase timeout if in slow network

### Pool exhausted error

Add more numbers to the pool or enable auto-provisioning:

```typescript
// Auto-provision is enabled by default in TwilioSmsService
// Just ensure your Twilio account has permission to buy numbers
```

## Production Checklist

- [ ] Twilio account verified and funded
- [ ] At least 3 phone numbers purchased
- [ ] Webhook URLs configured for all numbers
- [ ] Environment variables set in production environment
- [ ] API server publicly accessible
- [ ] Signature validation enabled (`TWILIO_AUTH_TOKEN` set)
- [ ] Rate limiting configured on webhook endpoints
- [ ] Monitoring/alerting set up for SMS failures
- [ ] Cost alerts configured in Twilio Console

## Security Best Practices

1. **Never commit credentials:**
   ```bash
   # .gitignore
   .env
   .env.local
   .env.production
   ```

2. **Use secrets management:**
   ```bash
   # AWS Secrets Manager
   aws secretsmanager get-secret-value --secret-id agentpass/twilio

   # Kubernetes Secrets
   kubectl create secret generic twilio-creds \
     --from-literal=account-sid=$TWILIO_ACCOUNT_SID \
     --from-literal=auth-token=$TWILIO_AUTH_TOKEN
   ```

3. **Rotate credentials periodically:**
   - Generate new Auth Token in Twilio Console
   - Update environment variables
   - Restart services

4. **Monitor for abuse:**
   - Set up alerts for high SMS volume
   - Implement rate limiting on MCP tools
   - Track per-agent usage

## Local Development with ngrok

To test webhooks locally:

```bash
# Terminal 1: Start API server
cd packages/api-server
pnpm start

# Terminal 2: Expose with ngrok
ngrok http 3846

# Use ngrok URL in Twilio webhook config:
# https://xxxx-xx-xx-xx-xx.ngrok.io/webhook/sms-received
```

## Docker Deployment

```dockerfile
# Dockerfile
FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
COPY packages/mcp-server/package.json ./packages/mcp-server/
COPY packages/api-server/package.json ./packages/api-server/

RUN npm install

COPY . .
RUN npm run build

ENV TWILIO_ACCOUNT_SID=""
ENV TWILIO_AUTH_TOKEN=""
ENV TWILIO_PHONE_NUMBERS=""
ENV AGENTPASS_API_URL=""

CMD ["npm", "start"]
```

```bash
docker build -t agentpass .
docker run -p 3846:3846 \
  -e TWILIO_ACCOUNT_SID=$TWILIO_ACCOUNT_SID \
  -e TWILIO_AUTH_TOKEN=$TWILIO_AUTH_TOKEN \
  -e TWILIO_PHONE_NUMBERS=$TWILIO_PHONE_NUMBERS \
  -e AGENTPASS_API_URL=$AGENTPASS_API_URL \
  agentpass
```

## Support

For issues or questions:
- Check [Twilio SMS Integration Docs](./twilio-sms-integration.md)
- Review [Architecture Documentation](./architecture.md)
- Open issue on GitHub
