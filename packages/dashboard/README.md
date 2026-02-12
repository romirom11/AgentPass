# AgentPass Dashboard

Web dashboard for managing AI agent passports and monitoring activity.

## Features

- **Agent List** — view all registered agents with their status, trust score, and last activity
- **Agent Detail** — detailed passport information, audit log, and credentials
- **Activity Feed** — real-time audit log across all agents
- **Responsive Design** — mobile-first responsive layout

## Tech Stack

- **React 19** — UI framework
- **React Router 7** — client-side routing
- **Tailwind CSS 4** — utility-first styling
- **Vite** — build tool and dev server
- **TypeScript** — type safety

## Development

```bash
# Install dependencies
pnpm install

# Start dev server (http://localhost:3847)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Environment Variables

Create a `.env` file (optional):

```env
VITE_API_URL=http://localhost:3846
```

If not provided, defaults to `http://localhost:3846`.

## API Integration

The dashboard communicates with the AgentPass API Server via the API client in `src/api/client.ts`.

### Available Endpoints

- `GET /passports` — list all passports
- `GET /passports/:id` — get passport details
- `POST /passports` — register new passport
- `DELETE /passports/:id` — revoke passport
- `GET /passports/:id/audit` — get audit log for passport
- `GET /audit` — get all audit logs across all passports

### API Client Usage

```typescript
import { apiClient } from "./api/client";

// List all passports
const passports = await apiClient.listPassports();

// Get specific passport
const passport = await apiClient.getPassport("passport-id");

// Get audit log
const audit = await apiClient.getAuditLog("passport-id", { limit: 50 });

// Get all audit logs
const allAudit = await apiClient.getAllAuditLogs({ limit: 100 });
```

### Custom Hooks

The `useApi` hook provides loading and error states:

```typescript
import { useApi } from "./hooks/useApi";
import { apiClient } from "./api/client";

function MyComponent() {
  const { data, loading, error, refetch } = useApi(
    () => apiClient.listPassports(),
    []
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  return <div>{data.length} passports</div>;
}
```

## Project Structure

```
src/
├── api/
│   └── client.ts          # API client for backend communication
├── components/
│   ├── Layout.tsx         # Main layout with navigation
│   ├── StatusBadge.tsx    # Status indicator component
│   └── TrustScoreBar.tsx  # Trust score visualization
├── hooks/
│   └── useApi.ts          # React hook for API calls
├── pages/
│   ├── AgentsPage.tsx     # Agent list view
│   ├── AgentDetailPage.tsx # Agent detail view
│   ├── ActivityPage.tsx   # Activity feed view
│   ├── ApprovalsPage.tsx  # Pending approvals (placeholder)
│   ├── DashboardPage.tsx  # Dashboard home (placeholder)
│   └── SettingsPage.tsx   # Settings (placeholder)
├── App.tsx                # Root component with routing
└── main.tsx              # Entry point
```

## Pages

### Agent List (`/agents`)

Displays all registered agents in a table with:
- Agent name and passport ID
- Status badge (active, revoked, pending)
- Trust score progress bar
- Last updated timestamp
- Link to agent detail page

**States:**
- Loading — spinner with loading message
- Error — error banner with message
- Empty — empty state with CTA
- Success — table with agents

### Agent Detail (`/agents/:id`)

Shows detailed information about a specific agent:
- Passport info (ID, public key, created date, status)
- Trust score visualization
- Audit log (recent 20 entries)
- Credentials list (if available in mock data)

**States:**
- Loading — full-screen spinner
- Error — error message with back link
- Not Found — not found message with back link
- Success — agent details

### Activity Feed (`/activity`)

Global audit log across all agents:
- Timestamp
- Agent ID
- Action (register, login, solve_captcha, etc.)
- Service
- Result (success, failure, pending)
- Duration

**States:**
- Loading — spinner
- Error — error banner
- Empty — empty state
- Success — activity table

## API Response Types

See `src/api/client.ts` for full TypeScript definitions.

## Production Deployment

```bash
# Build for production
pnpm build

# Output directory: dist/
# Serve with any static file server
```

The dashboard is a static SPA that can be deployed to:
- Cloudflare Pages
- Vercel
- Netlify
- AWS S3 + CloudFront
- Any static hosting

## Notes

- The dashboard currently falls back to mock data if the API is unavailable (for development)
- Real-time updates require WebSocket implementation (future enhancement)
- Authentication is not yet implemented (assumes single owner for MVP)
