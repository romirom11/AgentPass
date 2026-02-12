# AgentPass Quick Start Guide

This guide will walk you through setting up AgentPass locally and creating your first agent identity in 10 minutes.

## Prerequisites

Before you begin, ensure you have:

- **Node.js 22+** ([download](https://nodejs.org/))
- **pnpm 10+** (install: `npm install -g pnpm`)
- **Git** (for cloning the repository)

## Step 1: Installation

Clone the repository and install dependencies:

```bash
# Clone the repository
git clone https://github.com/romirom11/AgentPass.git
cd AgentPass

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

This will build all packages in the monorepo (~1-2 minutes).

## Step 2: Verify Installation

Run the test suite to ensure everything is working:

```bash
pnpm test
```

You should see all 523 tests passing. If any tests fail, check that you have Node.js 22+ installed.

## Step 3: Start the API Server

The API server manages passport registration, verification, and trust scoring.

```bash
# Start the API server on port 3846
pnpm --filter @agentpass/api-server dev
```

Verify the server is running:

```bash
# In a new terminal
curl http://localhost:3846/health
# Should return: {"status":"ok","version":"0.1.0","uptime_seconds":...}
```

## Step 4: Configure the MCP Server for Claude Code

The MCP Server is what AI agents (like Claude Code) connect to. Generate the Claude Code configuration:

```bash
node packages/mcp-server/dist/cli.js config
```

This will print a JSON configuration snippet. Add it to your Claude Code settings file:

**macOS/Linux:** `~/.claude/settings.json`
**Windows:** `%USERPROFILE%\.claude\settings.json`

```json
{
  "mcpServers": {
    "agentpass": {
      "command": "node",
      "args": ["/absolute/path/to/AgentPass/packages/mcp-server/dist/cli.js", "serve"]
    }
  }
}
```

**Important:** Replace `/absolute/path/to/AgentPass` with the actual absolute path to your AgentPass directory.

## Step 5: Restart Claude Code

Restart Claude Code to load the new MCP server. You should see AgentPass tools become available.

Verify by asking Claude Code:

```
What AgentPass tools are available?
```

You should see 17 tools listed (create_identity, list_identities, authenticate, etc.).

## Step 6: Create Your First Agent Identity

Ask Claude Code to create an agent identity:

```
Create a new agent identity for me called "test-agent" with description "My first AgentPass agent"
```

Claude Code will use the `create_identity` tool. You should see:

- A new Ed25519 keypair generated
- The passport registered with the API server
- A unique passport ID (e.g., `ap_7xk2m9f3abcd`)
- An email address assigned (e.g., `test-agent-7x@agent-mail.xyz`)

## Step 7: Test Email Functionality

Test that your agent can receive emails:

### Option A: Using Claude Code

Ask Claude Code:

```
Get my test-agent's email address, then wait for an email from any sender for 30 seconds.
```

In another terminal, send a test email to the agent's address (you'll need to use the production email worker or set up your own):

```bash
# The email address will be something like: test-agent-7x@agent-mail.xyz
# You can send a test email via any email client
```

### Option B: Using the Demo Script

The MCP server includes an E2E demo that creates an identity and tests email flow:

```bash
node packages/mcp-server/dist/cli.js demo
```

This will:
1. Create a demo agent identity
2. Register it with the API server
3. Simulate email reception
4. Verify the full flow

## Step 8: View Agent in Dashboard (Optional)

Start the owner dashboard to view your agent identities in a web UI:

```bash
# In a new terminal
pnpm --filter @agentpass/dashboard dev
```

Open http://localhost:3847 in your browser. You should see:

- List of agent identities
- Trust scores
- Audit logs
- Stored credentials

## Step 9: Test Authentication (Fallback Mode)

Try authenticating on a service using fallback mode. Ask Claude Code:

```
Authenticate on example.com using my test-agent identity
```

Claude Code will:
1. Check if credentials exist for example.com (they won't)
2. Launch Playwright browser
3. Attempt to register/login using the agent's email
4. Handle email verification if needed
5. Store credentials in the encrypted vault

**Note:** Fallback mode requires the target service to support email-based registration. Some services may have CAPTCHA or other bot detection that requires manual intervention.

## Step 10: Retrieve Stored Credentials

After authenticating once, credentials are stored in the local encrypted vault. Ask Claude Code:

```
List all credentials stored for test-agent
```

You should see:

```json
{
  "credentials": [
    {
      "service": "example.com",
      "username": "test-agent-7x@agent-mail.xyz",
      "last_used": "2026-02-12T10:00:00.000Z"
    }
  ]
}
```

**Note:** Passwords are never displayed — they remain encrypted in the vault.

## Troubleshooting

### MCP Server Not Connecting

**Problem:** Claude Code shows "MCP server failed to start"

**Solutions:**
- Ensure the path in `settings.json` is absolute (not relative)
- Check that `pnpm build` completed successfully
- Run `node packages/mcp-server/dist/cli.js info` to verify the CLI works
- Check Claude Code logs for detailed error messages

### API Server Connection Failed

**Problem:** MCP tools return "API server unreachable"

**Solutions:**
- Ensure the API server is running: `curl http://localhost:3846/health`
- Check that port 3846 is not blocked by firewall
- Verify `MCP_API_URL` environment variable (default: `http://localhost:3846`)

### Email Not Received

**Problem:** `wait_for_email` times out

**Solutions:**
- Ensure you're using the production email worker (`@agent-mail.xyz` domain)
- Check the email notification webhook endpoint: `curl http://localhost:3846/webhook/email-notifications/your-agent-email@agent-mail.xyz`
- Verify `WEBHOOK_SECRET` matches between API server and Cloudflare Worker

### Database Errors

**Problem:** "Database locked" or "Table does not exist"

**Solutions:**
- Delete the database file: `rm agentpass.db`
- Restart the API server to recreate tables
- Ensure you're not running multiple API server instances on the same database

### Browser Automation Fails

**Problem:** Playwright browser doesn't launch

**Solutions:**
- Install Playwright browsers: `cd packages/browser-service && npx playwright install`
- Check that Chromium is installed: `npx playwright install chromium`
- Run in headed mode for debugging (set `headless: false` in browser config)

## Next Steps

Now that you have AgentPass running locally:

1. **Integrate with your service:** Follow the [SDK Integration Guide](sdk-guide.md) to add native AgentPass authentication to your service
2. **Deploy to production:** Follow the [Deployment Guide](deployment.md) to deploy the API server and email worker
3. **Explore the architecture:** Read the [Architecture Documentation](architecture.md) to understand how AgentPass works under the hood
4. **Create more agents:** Each agent should have its own identity for security isolation

## Production Usage

For production deployment:

1. **API Server:** Deploy to Dokploy, Railway, or your preferred hosting platform
2. **Email Service:** Deploy Cloudflare Worker and configure Email Routing
3. **Database:** Use Turso (libSQL) for production-grade distributed SQLite
4. **Secrets:** Use proper secret management (never commit `.env` files)

See the [Deployment Guide](deployment.md) for complete instructions.

## Getting Help

- **Documentation:** Check the [docs/](.) directory
- **Issues:** Open an issue on GitHub
- **API Reference:** See [api-reference.md](api-reference.md)
- **Architecture:** See [architecture.md](architecture.md)
