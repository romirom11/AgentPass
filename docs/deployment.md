# AgentPass Deployment Guide

Complete guide for deploying AgentPass to production.

## Prerequisites

- [ ] Cloudflare account (for Email Worker)
- [ ] Domain `agent-mail.xyz` configured in Cloudflare DNS
- [ ] Domain `agentpass.kdnx.cloud` pointing to your server
- [ ] Node.js 22+ and pnpm installed
- [ ] Wrangler CLI: `npm install -g wrangler`

---

## 1. Email Service (Cloudflare Email Worker)

### Setup Email Routing

1. **Add domain to Cloudflare**
   - Dashboard → Websites → Add Site → `agent-mail.xyz`
   - Update nameservers at your registrar

2. **Enable Email Routing**
   - Dashboard → Email → Email Routing → Enable
   - Click "Get Started"

3. **Configure Catch-All Rule**
   - Email Routing → Routing Rules
   - Add **Catch-All Address**:
     - Pattern: `*@agent-mail.xyz`
     - Action: **Send to Worker**
     - Worker: `agentpass-email-worker` (will create next)

### Deploy Email Worker

```bash
cd packages/email-service

# Authenticate with Cloudflare
wrangler login

# Set secrets
wrangler secret put WEBHOOK_SECRET
# Enter: <generate strong random key, save it for API server>

wrangler secret put API_SERVER_URL
# Enter: https://agentpass.kdnx.cloud

# Deploy worker
pnpm build
wrangler deploy --env production

# Test deployment
curl https://agentpass-email-worker.<your-subdomain>.workers.dev/emails/test@agent-mail.xyz
```

### Configure Custom Domain for Worker (Optional)

To use `https://email.agent-mail.xyz` instead of `*.workers.dev`:

```bash
wrangler domains add email.agent-mail.xyz
```

Or via Cloudflare Dashboard:
- Workers & Pages → agentpass-email-worker → Settings → Domains & Routes
- Add Custom Domain: `email.agent-mail.xyz`

---

## 2. API Server

### Option A: Deploy to Railway

1. **Create new project**
   ```bash
   railway login
   railway init
   railway link
   ```

2. **Set environment variables**
   ```bash
   railway variables set WEBHOOK_SECRET="<same-as-worker>"
   railway variables set NODE_ENV=production
   ```

3. **Deploy**
   ```bash
   cd packages/api-server
   railway up
   ```

4. **Configure domain**
   - Railway Dashboard → Settings → Networking
   - Add custom domain: `agentpass.kdnx.cloud`

### Option B: Deploy to Render

1. **Create Web Service**
   - Dashboard → New → Web Service
   - Connect GitHub repo
   - Root Directory: `packages/api-server`
   - Build Command: `pnpm install && pnpm build`
   - Start Command: `node dist/index.js`

2. **Environment Variables**
   ```
   WEBHOOK_SECRET=<same-as-worker>
   NODE_ENV=production
   AGENTPASS_PORT=3846
   AGENTPASS_DB_PATH=agentpass.db
   ```

3. **Custom Domain**
   - Settings → Custom Domains
   - Add: `agentpass.kdnx.cloud`

### Option C: Self-Hosted (VPS)

```bash
# On your server
cd /opt
git clone https://github.com/your-username/AgentPass.git
cd AgentPass

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Create systemd service
sudo nano /etc/systemd/system/agentpass-api.service
```

Service file:
```ini
[Unit]
Description=AgentPass API Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/AgentPass/packages/api-server
Environment="NODE_ENV=production"
Environment="WEBHOOK_SECRET=your-secret-here"
Environment="AGENTPASS_PORT=3846"
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
# Start service
sudo systemctl daemon-reload
sudo systemctl enable agentpass-api
sudo systemctl start agentpass-api

# Check status
sudo systemctl status agentpass-api
```

**Nginx reverse proxy:**
```nginx
server {
    listen 80;
    server_name agentpass.kdnx.cloud;

    location / {
        proxy_pass http://localhost:3846;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 3. Landing Page

### Deploy to Cloudflare Pages

```bash
cd packages/landing

# Build
pnpm build

# Deploy
npx wrangler pages deploy dist --project-name agentpass-landing
```

Or connect via Cloudflare Dashboard:
- Pages → Create Project → Connect GitHub
- Build settings:
  - Framework: Vite
  - Build command: `pnpm build`
  - Build output: `dist`

**Custom domain:**
- Cloudflare Pages → agentpass-landing → Custom Domains
- Add: `agentpass.xyz` or `www.agentpass.xyz`

---

## 4. Dashboard (Owner Web Interface)

### Deploy to Vercel

```bash
cd packages/dashboard

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Or via GitHub:
- Vercel Dashboard → New Project → Import from GitHub
- Root Directory: `packages/dashboard`
- Framework: Vite/React
- Build Command: `pnpm build`
- Output Directory: `dist`

**Custom domain:**
- Vercel → Project Settings → Domains
- Add: `dashboard.agentpass.kdnx.cloud`

---

## 5. Environment Variables Summary

### Email Worker (Cloudflare)
```bash
WEBHOOK_SECRET="<random-key>"
API_SERVER_URL="https://agentpass.kdnx.cloud"
```

### API Server
```bash
WEBHOOK_SECRET="<same-as-worker>"
NODE_ENV="production"
AGENTPASS_PORT=3846
AGENTPASS_DB_PATH="agentpass.db"
```

### Dashboard
```bash
VITE_API_URL="https://agentpass.kdnx.cloud"
```

---

## 6. Testing End-to-End

### Test Email Flow

1. **Send test email via Cloudflare Email Testing**
   - Cloudflare Dashboard → Email Routing → Test Email Routing
   - To: `test@agent-mail.xyz`
   - Check worker logs: `wrangler tail`

2. **Check email stored in worker**
   ```bash
   curl https://email.agent-mail.xyz/emails/test@agent-mail.xyz
   ```

3. **Check webhook received by API**
   ```bash
   curl https://agentpass.kdnx.cloud/webhook/email-notifications/test@agent-mail.xyz
   ```

### Test Passport Creation

```bash
# Create passport
curl -X POST https://agentpass.kdnx.cloud/passports \
  -H "Content-Type: application/json" \
  -d '{
    "public_key": "ed25519:MCowBQYDK2VwAyEA...",
    "owner_email": "test@example.com",
    "name": "Test Agent"
  }'

# Verify passport
curl -X POST https://agentpass.kdnx.cloud/verify \
  -H "Content-Type: application/json" \
  -d '{
    "passport_id": "ap_...",
    "challenge": "test123",
    "signature": "..."
  }'
```

---

## 7. Monitoring & Logs

### Email Worker Logs
```bash
wrangler tail
```

### API Server Logs

**Railway:**
```bash
railway logs
```

**Render:**
- Dashboard → Service → Logs

**Self-hosted:**
```bash
sudo journalctl -u agentpass-api -f
```

---

## 8. Security Checklist

- [ ] HTTPS enabled on all domains
- [ ] `WEBHOOK_SECRET` is strong and matches on both worker and API
- [ ] API server only accepts webhooks with valid secret
- [ ] Cloudflare Email Routing catch-all points to worker
- [ ] CORS configured on API server for dashboard domain
- [ ] Rate limiting enabled on API endpoints
- [ ] Database backups configured (if using SQLite file)

---

## 9. DNS Configuration

### agent-mail.xyz
```
Type    Name    Content
A       @       <cloudflare-proxy-ip>
MX      @       route1.mx.cloudflare.net (Priority 10)
MX      @       route2.mx.cloudflare.net (Priority 20)
TXT     @       v=spf1 include:_spf.mx.cloudflare.net ~all
```

### agentpass.kdnx.cloud
```
Type    Name              Content
A       agentpass         <your-server-ip>
CNAME   dashboard         <vercel-domain>
CNAME   email             agentpass-email-worker.<subdomain>.workers.dev
```

---

## 10. Troubleshooting

### Emails not arriving
1. Check Email Routing is enabled
2. Verify catch-all rule is active
3. Test with Cloudflare Email Testing tool
4. Check worker logs: `wrangler tail`

### Webhook not working
1. Verify `WEBHOOK_SECRET` matches
2. Check API server is publicly accessible
3. Test webhook manually: `curl -X POST https://agentpass.kdnx.cloud/webhook/email-received ...`
4. Check API server logs

### Worker deployment fails
1. Ensure Durable Objects are enabled
2. Check wrangler.toml migrations
3. Verify `compatibility_date` is recent
4. Try: `wrangler deploy --compatibility-date=2024-01-15`

---

## Production Checklist

- [ ] Email Worker deployed and receiving emails
- [ ] API Server deployed and webhook working
- [ ] Landing page live
- [ ] Dashboard live and connected to API
- [ ] All environment variables set correctly
- [ ] HTTPS enabled on all domains
- [ ] DNS configured correctly
- [ ] Email flow tested end-to-end
- [ ] Passport creation tested
- [ ] Monitoring/logging set up
- [ ] Backups configured

---

## Next Steps

After deployment:
1. Update MCP Server config to use production API URL
2. Test full agent authentication flow
3. Set up monitoring/alerts
4. Document API for third-party integrations
5. Create demo video

