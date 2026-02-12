# 🚀 AgentPass Deployment — Ready to Go!

## ✅ Що вже готово:

1. ✅ Email Worker задеплоєний на Cloudflare
2. ✅ Email Routing налаштований (Catch-all → Worker)
3. ✅ Webhook secret встановлений
4. ✅ Код в Git (commit pushed)

---

## 📦 Крок 1: Deploy API Server в Dokploy

### В Dokploy Dashboard:

1. **Create New Project**
   - Name: `AgentPass API`
   - Type: **Docker Compose**

2. **Git Repository**
   - URL: `https://github.com/romirom11/AgentPass.git`
   - Branch: `main`
   - Path: `/` (root)

3. **Environment Variables**
   ```
   NODE_ENV=production
   AGENTPASS_PORT=3846
   AGENTPASS_DB_PATH=/app/data/agentpass.db
   WEBHOOK_SECRET=pWILpbbmQySqXjx9cPYfkDgAJ0rDhRl5ZacHA4tLPoc=
   ```

4. **Deploy Settings**
   - Docker Compose file: `docker-compose.yml`
   - Auto-deploy on push: ✅ (optional)

5. **Click "Deploy"**

---

## 🧪 Крок 2: Тестування

### 2.1 Перевірка API

```bash
curl https://agentpass.kdnx.cloud/health
# Має повернути: {"status":"ok"}

curl https://agentpass.kdnx.cloud/.well-known/agentpass.json
# Має повернути JSON з інфо про API
```

### 2.2 Тест Email Flow

1. **Надішли email через Cloudflare Email Testing**
   - Dashboard → Email → Email Routing → Test Email Routing
   - To: `test@agent-mail.xyz`
   - Check logs

2. **Перевір webhook отримано**
   ```bash
   curl https://agentpass.kdnx.cloud/webhook/email-notifications/test@agent-mail.xyz
   ```

3. **Прочитай email з worker**
   ```bash
   curl https://agentpass-email-worker-production.kudin-private.workers.dev/emails/test@agent-mail.xyz
   ```

---

## 📊 URLs Summary

| Service | URL |
|---------|-----|
| API Server | https://agentpass.kdnx.cloud |
| Email Worker | https://agentpass-email-worker-production.kudin-private.workers.dev |
| Email Domain | *@agent-mail.xyz |
| Webhook Secret | `pWILpbbmQySqXjx9cPYfkDgAJ0rDhRl5ZacHA4tLPoc=` |

---

## 🔧 Troubleshooting

### API не запускається

```bash
# Check Dokploy logs
dokploy logs agentpass-api

# Check container status
docker ps | grep agentpass
```

### Webhook не працює

```bash
# Test webhook manually
curl -X POST https://agentpass.kdnx.cloud/webhook/email-received \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: pWILpbbmQySqXjx9cPYfkDgAJ0rDhRl5ZacHA4tLPoc=" \
  -d '{
    "email_id": "test-123",
    "to": "test@agent-mail.xyz",
    "from": "github@email.github.com",
    "subject": "Test",
    "received_at": "2024-02-12T10:00:00Z"
  }'
```

### Email не приходять

1. Check Email Routing: Dashboard → Email → Email Routing → Routing rules
2. Verify Catch-all rule → Worker: `agentpass-email-worker-production`
3. Check worker logs: `wrangler tail --env production`

---

## 🎉 Готово!

Після успішного deployment API Server — система готова до використання!

**Next steps:**
- Deploy Landing Page (Cloudflare Pages)
- Deploy Dashboard (Vercel/Cloudflare Pages)
- Test full agent registration flow
