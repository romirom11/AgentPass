# PostgreSQL Migration Guide

This document describes the migration from SQLite (@libsql/client) to PostgreSQL (postgres package) for the AgentPass API Server.

## What Changed

### Database Driver
- **Before:** `@libsql/client` (SQLite/Turso)
- **After:** `postgres` (porsager/postgres) — production-grade PostgreSQL driver

### Query Syntax
- **Before:** `db.execute({ sql: "SELECT * FROM table WHERE id = ?", args: [id] })`
- **After:** `db\`SELECT * FROM table WHERE id = ${id}\`` (tagged template literals)

### Data Types
- **INTEGER booleans (0/1)** → **BOOLEAN (true/false)**
- **TEXT timestamps (ISO strings)** → **TIMESTAMPTZ (native Date objects)**
- **TEXT JSON columns** → **JSONB (native objects, auto-parsed)**
- Manual `JSON.parse()`/`JSON.stringify()` removed for JSONB columns

### Schema Changes
```sql
-- Before (SQLite)
verified INTEGER NOT NULL DEFAULT 0
created_at TEXT NOT NULL

-- After (PostgreSQL)
verified BOOLEAN NOT NULL DEFAULT false
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

## Local Development Setup

### 1. Start PostgreSQL
```bash
docker-compose up -d postgres
```

Or install PostgreSQL locally:
```bash
# macOS
brew install postgresql@17
brew services start postgresql@17

# Ubuntu/Debian
sudo apt install postgresql-17
sudo systemctl start postgresql
```

### 2. Create Database
```bash
psql -U postgres -c "CREATE DATABASE agentpass;"
psql -U postgres -c "CREATE USER agentpass WITH PASSWORD 'agentpass';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE agentpass TO agentpass;"
```

### 3. Update Environment Variables
```bash
# .env
DATABASE_URL=postgresql://agentpass:agentpass@localhost:5432/agentpass
```

### 4. Run Migrations
The schema is auto-created on first run via `initDatabase()` in `src/db/schema.ts`.

```bash
cd packages/api-server
pnpm dev
```

## Testing

Tests require a PostgreSQL instance. Set `DATABASE_URL` before running tests:

```bash
# Create test database
psql -U postgres -c "CREATE DATABASE agentpass_test;"

# Run tests
DATABASE_URL=postgresql://agentpass:agentpass@localhost:5432/agentpass_test pnpm test
```

## Production Deployment

### Recommended Providers
1. **Neon** — Serverless PostgreSQL with instant branching
   - Connection string: `postgresql://user:pass@ep-xxx.region.aws.neon.tech/agentpass?sslmode=require`

2. **Supabase** — PostgreSQL with built-in API and real-time subscriptions
   - Connection string: `postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres`

3. **Railway/Render** — Platform-provided PostgreSQL
   - Use `DATABASE_URL` environment variable from platform

### Environment Variables
```bash
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

### Docker Deployment
```bash
# docker-compose.yml includes PostgreSQL service
docker-compose up -d
```

## Migration from Existing SQLite Data

If you have existing data in SQLite that needs to be migrated:

1. Export from SQLite:
```bash
sqlite3 agentpass.db .dump > backup.sql
```

2. Convert to PostgreSQL format:
```bash
# Install pgloader (macOS)
brew install pgloader

# Migrate
pgloader sqlite://agentpass.db postgresql://localhost/agentpass
```

3. Update boolean columns:
```sql
UPDATE owners SET verified = CASE WHEN verified = 1 THEN true ELSE false END;
```

4. Update timestamp columns (if needed):
```sql
-- PostgreSQL will auto-parse ISO 8601 strings to TIMESTAMPTZ
-- If conversion is needed:
ALTER TABLE owners ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at::timestamptz;
```

## Common Issues

### Connection Refused
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution:** Ensure PostgreSQL is running and DATABASE_URL is correct.

### Authentication Failed
```
Error: password authentication failed for user "agentpass"
```
**Solution:** Check username/password in DATABASE_URL.

### Database Does Not Exist
```
Error: database "agentpass" does not exist
```
**Solution:** Create the database first (see Local Development Setup).

### SSL Required
```
Error: The server does not support SSL connections
```
**Solution:** Remove `?sslmode=require` from DATABASE_URL (local dev) or enable SSL (production).

## Performance Considerations

### Connection Pooling
The postgres driver includes built-in connection pooling (max: 10 connections by default).

To adjust:
```typescript
const sql = postgres(connectionString, {
  max: 20, // max connections
  idle_timeout: 30,
  connect_timeout: 10,
});
```

### Indexes
All necessary indexes are created automatically:
- `idx_owners_email` on `owners(email)`
- `idx_audit_log_passport_id` on `audit_log(passport_id, created_at DESC)`
- `idx_email_notifications_recipient` on `email_notifications(recipient, received_at DESC)`
- `idx_sms_notifications_phone` on `sms_notifications(phone_number, received_at DESC)`

### Query Performance
PostgreSQL's query planner is significantly more sophisticated than SQLite. For best performance:
- Use prepared statements (automatic with tagged templates)
- Leverage JSONB indexing for metadata queries (if needed)
- Monitor with `EXPLAIN ANALYZE` for slow queries

## Rollback Plan

If you need to rollback to SQLite:

1. Checkout previous commit:
```bash
git checkout <commit-before-migration>
```

2. Restore dependencies:
```bash
cd packages/api-server
pnpm install
```

3. Update environment:
```bash
AGENTPASS_DB_PATH=./agentpass.db
```

## Support

For issues or questions:
- Check logs: `docker-compose logs postgres`
- PostgreSQL docs: https://www.postgresql.org/docs/
- postgres driver docs: https://github.com/porsager/postgres
