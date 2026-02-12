# AgentPass — The Identity Layer for Autonomous AI Agents

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/Tests-523%20passing-success.svg)](https://github.com/romirom11/AgentPass)

> **Give your AI agents a passport to the internet.**

The identity layer for autonomous AI agents. AgentPass provides cryptographically signed digital identities that enable AI agents to authenticate on any internet service — just like "Auth0 for AI Agents".

## The Problem

AI agents (Claude Code, OpenClaw, CrewAI, AutoGPT) are becoming increasingly autonomous, but they **cannot exist on the internet as independent entities**:

- An agent cannot register on a website — it has no email address
- An agent cannot pass SMS verification — it has no phone number
- An agent cannot prove its identity — it has no cryptographic signature
- An agent cannot log back in — it doesn't remember credentials
- Services cannot distinguish legitimate agents from spam bots

**Result:** Every time an agent encounters an auth flow, it stops and waits for a human. Autonomy is broken.

**Authentication is the recognized #1 bottleneck in the AI agent ecosystem.**

## The Solution

**AgentPass** is a passport system for AI agents. Each agent receives a cryptographically signed digital identity (Agent Passport) enabling it to authenticate on any internet service.

AgentPass works in two modes:

1. **Native Mode** — Service has integrated the AgentPass SDK → agent authenticates instantly (like "Login with Google")
2. **Fallback Mode** — Service not integrated → agent registers as a human using passport infrastructure (email, SMS, browser automation)

**Positioning:** "Auth0 for AI Agents"

## Features

- **Cryptographic Identity** -- Ed25519 key pairs per agent; private key never leaves the agent's machine
- **Credential Vault** -- AES-256-GCM encrypted local storage for service credentials
- **Native Authentication** -- instant challenge-response auth for integrated services (like "Login with Google" but for agents)
- **Fallback Authentication** -- browser automation with Playwright for non-integrated services
- **Dedicated Email** -- per-agent email addresses for verification flows
- **SMS Verification** -- phone numbers for OTP flows
- **Trust Scoring** -- reputation system (0-100) based on owner verification, age, and usage history
- **Audit Logging** -- every agent action is logged with timestamp, details, and result
- **Owner Controls** -- bounded autonomy with configurable permissions, approval flows, and instant revocation
- **MCP Integration** -- full Model Context Protocol support for Claude Code and other MCP clients
- **Service SDK** -- npm package for third-party services to verify agents server-side

## Quick Start

### Prerequisites

- Node.js >= 22.0.0
- pnpm >= 10.0.0

### Installation

```bash
# Clone the repository
git clone https://github.com/romirom11/AgentPass.git
cd AgentPass

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run all 523 tests
pnpm test
```

### Running the MCP Server

The MCP Server is what AI agents (like Claude Code) connect to for identity management.

```bash
# Start the MCP server (stdio transport)
node packages/mcp-server/dist/cli.js serve

# Or run the E2E demo
node packages/mcp-server/dist/cli.js demo

# Print available tools
node packages/mcp-server/dist/cli.js info

# Generate Claude Code config
node packages/mcp-server/dist/cli.js config
```

### Connecting to Claude Code

Add AgentPass to your Claude Code MCP configuration (`~/.claude/settings.json` or `.claude/settings.local.json`):

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

Or generate the config automatically:

```bash
node packages/mcp-server/dist/cli.js config
```

### Running Other Services

```bash
# Start API server (port 3846)
pnpm --filter @agentpass/api-server dev

# Start owner dashboard (port 3847)
pnpm --filter @agentpass/dashboard dev

# Start landing page (port 3848)
pnpm --filter @agentpass/landing dev
```

For detailed setup instructions, see [docs/quick-start.md](docs/quick-start.md).

## Architecture

AgentPass is a distributed system with components running locally (on the agent's machine) and remotely (API server, email service).

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI Agent (Claude Code, etc.)                │
└───────────────────────────────┬─────────────────────────────────┘
                                │ MCP Protocol (stdio/SSE)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              AgentPass MCP Server (local machine)               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  - Identity Management (Ed25519 keypairs)                 │  │
│  │  - Credential Vault (SQLite + AES-256-GCM encryption)     │  │
│  │  - Authentication Logic (native + fallback modes)         │  │
│  │  - Browser Automation (Playwright)                        │  │
│  └───────────────────────────────────────────────────────────┘  │
└───────┬──────────────────┬────────────────────┬─────────────────┘
        │                  │                    │
        ▼                  ▼                    ▼
┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ API Server   │  │  Email Service   │  │  SMS Service     │
│ (Hono)       │  │  (CF Workers)    │  │  (Twilio)        │
│              │  │                  │  │                  │
│ - Passport   │  │ - Email routing  │  │ - Phone numbers  │
│   registry   │  │ - OTP extraction │  │ - SMS reception  │
│ - Signature  │  │ - Verification   │  │ - OTP codes      │
│   verify     │  │   links          │  │                  │
│ - Trust      │  │                  │  │                  │
│   scoring    │  │ @agent-mail.xyz  │  │                  │
│ - Audit log  │  │                  │  │                  │
└──────────────┘  └──────────────────┘  └──────────────────┘
```

**Key Security Principle:** The agent's private key and credential vault live exclusively on the agent's machine. The API server stores only public keys and metadata. A compromised API server cannot forge agent signatures or access stored credentials.

For the full architecture document, see [docs/architecture.md](docs/architecture.md).

## MCP Tools

AgentPass exposes 17 tools via the Model Context Protocol:

### Identity Management

| Tool | Description |
|------|-------------|
| `create_identity` | Create a new agent identity with an Ed25519 key pair |
| `list_identities` | List all locally stored agent identities |
| `get_identity` | Get full passport details for a specific agent |

### Credential Management

| Tool | Description |
|------|-------------|
| `store_credential` | Store a service credential in the encrypted local vault |
| `get_credential` | Retrieve a stored credential for a specific service |
| `list_credentials` | List all stored credentials (service names and usernames only, never passwords) |

### Authentication

| Tool | Description |
|------|-------------|
| `authenticate` | Authenticate on a service (auto-detects native vs fallback mode) |
| `check_auth_status` | Check if credentials exist for a service without triggering auth |

### Email

| Tool | Description |
|------|-------------|
| `get_email_address` | Get the agent's dedicated email address |
| `wait_for_email` | Wait for an email to arrive, optionally filtered by sender or subject |
| `read_email` | Read the full content of an email by ID |
| `extract_verification_link` | Extract a verification URL from an email body |
| `extract_otp_code` | Extract a one-time password (4-8 digits) from an email |
| `list_emails` | List all emails received at an address |

### SMS

| Tool | Description |
|------|-------------|
| `get_phone_number` | Get the agent's dedicated phone number for SMS verification |
| `wait_for_sms` | Wait for an SMS message to arrive |
| `extract_otp_from_sms` | Extract a one-time password from an SMS message |

## Packages

AgentPass is a monorepo containing multiple packages:

| Package | Description | Technology |
|---------|-------------|------------|
| **@agentpass/core** | Shared library: crypto (Ed25519, AES-256-GCM), passport types, vault, errors, logger | TypeScript |
| **@agentpass/mcp-server** | MCP Server exposing 17 tools for AI agents | TypeScript, @modelcontextprotocol/sdk |
| **@agentpass/api-server** | HTTP API for passport registry, verification, trust scoring, audit logs | Hono, libSQL |
| **@agentpass/email-service** | Email routing and storage using Cloudflare Workers + Durable Objects | Cloudflare Workers, postal-mime |
| **@agentpass/browser-service** | Browser automation for fallback registration/login flows | Playwright |
| **@agentpass/sdk** | SDK for third-party services to verify agent identities | TypeScript |
| **@agentpass/dashboard** | Owner dashboard for managing agents and viewing audit logs | React 19, Tailwind CSS 4 |
| **@agentpass/landing** | Landing page | React 19, Tailwind CSS 4 |

## API Reference

The AgentPass API Server (deployed at `https://api.agentpass.space`, default local port 3846) provides:

### Passport Management

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/passports` | Register a new passport (public key) |
| `GET` | `/passports/:id` | Get passport public info and metadata |
| `DELETE` | `/passports/:id` | Revoke a passport (irreversible) |

### Verification & Trust

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/verify` | Verify a passport signature using Ed25519 challenge-response |
| `GET` | `/passports/:id/trust` | Get trust score details (0-100) |
| `POST` | `/passports/:id/report-abuse` | Report abuse against a passport |

### Audit Logging

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/passports/:id/audit` | Append an audit log entry |
| `GET` | `/passports/:id/audit` | List audit log entries (paginated) |

### Webhooks

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/webhook/email-received` | Email notification webhook (called by Cloudflare Worker) |
| `GET` | `/webhook/email-notifications/:address` | Poll for new email notifications |

### Discovery & Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/.well-known/agentpass.json` | AgentPass discovery endpoint |
| `GET` | `/health` | Health check |
| `GET` | `/ready` | Readiness check (database connectivity) |

For full request/response documentation with examples, see [docs/api-reference.md](docs/api-reference.md).

## SDK Integration

Third-party services can integrate AgentPass using the `@agentpass/sdk` package for native authentication:

```typescript
import { AgentPassSDK } from '@agentpass/sdk';

const agentpass = new AgentPassSDK({
  apiUrl: 'https://api.agentpass.space',
});

// Verify an agent's identity
const result = await agentpass.verify({
  passportId: 'ap_7xk2m9f3abcd',
  challenge: 'random-nonce-abc123',
  signature: 'base64url-encoded-signature',
});

if (result.valid) {
  console.log('Agent authenticated!');
  console.log('Trust score:', result.trust_score);
}
```

For the complete SDK integration guide, see [docs/sdk-guide.md](docs/sdk-guide.md).

## Docker Deployment

### API Server

```bash
# Build the API server image
docker build -f packages/api-server/Dockerfile -t agentpass-api .

# Run with persistent data
docker run -p 3846:3846 \
  -v agentpass-data:/data \
  -e WEBHOOK_SECRET=your-secret-here \
  agentpass-api
```

For complete deployment instructions (including Cloudflare Workers), see [docs/deployment.md](docs/deployment.md).

## Project Structure

```
AgentPass/
├── packages/
│   ├── core/                  # Shared library: crypto, passport, vault, types, errors, logger
│   ├── mcp-server/            # MCP Server + CLI (what agents call via Claude Code)
│   ├── api-server/            # HTTP API Server (Hono + libSQL)
│   ├── sdk/                   # Service SDK (@agentpass/sdk)
│   ├── email-service/         # Email handling (verification links, OTP extraction)
│   ├── browser-service/       # Playwright browser automation + proxy management
│   ├── dashboard/             # Owner Web Dashboard (React + Tailwind)
│   └── landing/               # Landing Page (React + Tailwind)
├── docs/                      # Project documentation
│   ├── architecture.md        # System architecture
│   ├── api-reference.md       # API endpoint reference
│   ├── sdk-guide.md           # SDK integration guide
│   ├── prd.md                 # Product Requirements Document
│   ├── roadmap.md             # Development roadmap
│   └── user-stories.md        # User stories
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.base.json
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| MCP Server | TypeScript, @modelcontextprotocol/sdk |
| API Server | Hono (lightweight, edge-ready) |
| Database | libSQL / Turso |
| Crypto | Node.js crypto (Ed25519, AES-256-GCM) |
| Dashboard | React 19 + Tailwind CSS 4 |
| Browser | Playwright |
| Runtime | Node.js 22+ with ESM modules |
| Package Manager | pnpm 10+ |
| Testing | Vitest (523 tests) |
| Linting | ESLint + Prettier |
| Containerization | Docker |

## Development

### Building and Testing

```bash
# Build all packages
pnpm build

# Run all 523 tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code with Prettier
pnpm format

# Check formatting
pnpm format:check

# Clean build artifacts
pnpm clean
```

### Environment Variables

Create a `.env` file in the root directory (see `.env.example` for all options):

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Node environment |
| `AGENTPASS_PORT` | `3846` | API server port |
| `AGENTPASS_DB_PATH` | `agentpass.db` | Database file path (SQLite) |
| `WEBHOOK_SECRET` | (required) | Secret for webhook authentication |
| `VITE_API_URL` | `http://localhost:3846` | API URL for dashboard |

For production deployment variables, see `.env.example`.

## Documentation

### Getting Started

- **[Quick Start Guide](docs/quick-start.md)** — Set up AgentPass locally in 10 minutes
- **[Deployment Guide](docs/deployment.md)** — Complete production deployment (Dokploy, Cloudflare Workers)

### Technical Documentation

- **[System Architecture](docs/architecture.md)** — Detailed system design, component interaction, security model
- **[API Reference](docs/api-reference.md)** — Complete HTTP API documentation with request/response examples
- **[SDK Integration Guide](docs/sdk-guide.md)** — How to integrate AgentPass into your service
- **[Email Service](docs/email-service.md)** — Cloudflare Workers email routing architecture

### Project Documentation

- **[Product Requirements Document](docs/prd.md)** — Complete product specification
- **[Development Roadmap](docs/roadmap.md)** — Feature roadmap and milestones
- **[User Stories](docs/user-stories.md)** — Use cases and user journeys
- **[Dashboard Implementation](docs/dashboard-implementation.md)** — Dashboard architecture and features

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository** and create a feature branch
2. **Follow code conventions** defined in [CLAUDE.md](CLAUDE.md)
3. **Write tests** for new features (we maintain 523+ tests)
4. **Use conventional commits**: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
5. **Run tests and linting** before submitting:
   ```bash
   pnpm test
   pnpm lint
   pnpm format
   ```
6. **Submit a Pull Request** with a clear description

## License

MIT License — see [LICENSE](LICENSE) for details.

## Built For

**Anthropic Build-a-thon 2025**

AgentPass is built to solve the authentication bottleneck in the AI agent ecosystem, enabling truly autonomous AI agents to operate on the internet with cryptographically-verified identities.
