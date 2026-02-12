# Browser Service Integration

This document describes how the Browser Service is integrated into the MCP Server via the `PlaywrightBrowserAdapter`.

## Architecture

```
┌─────────────────────────────────────────┐
│     FallbackAuthService                 │
│  (Orchestrates auth flow)               │
└───────────────┬─────────────────────────┘
                │ uses BrowserOperations
                │ interface
┌───────────────▼─────────────────────────┐
│   PlaywrightBrowserAdapter              │
│  (Implements BrowserOperations)         │
└───────────────┬─────────────────────────┘
                │ delegates to
┌───────────────▼─────────────────────────┐
│     Browser Service                     │
│  • BrowserManager (lifecycle)           │
│  • Page Helpers (automation)            │
│  • Strategies (login, register)         │
└─────────────────────────────────────────┘
```

## Components

### 1. BrowserOperations Interface

Defined in `services/fallback-auth-service.ts`, this interface abstracts browser automation:

```typescript
interface BrowserOperations {
  login(url: string, credentials: { username: string; password: string }): Promise<LoginResult>;
  register(url: string, options: { email: string; password: string; name?: string }): Promise<RegistrationResult>;
}
```

### 2. PlaywrightBrowserAdapter

Located in `adapters/playwright-browser-adapter.ts`, this adapter:

- Implements `BrowserOperations` using the `browser-service` package
- Manages browser lifecycle (launch, page creation, cleanup)
- Extracts session tokens and cookies after successful auth
- Maps browser-service results to FallbackAuthService result types

**Key Features:**

- **Lazy browser launch**: Browser is launched only when needed (first operation)
- **Session extraction**: Automatically extracts tokens from localStorage/sessionStorage and cookies
- **Error handling**: Wraps all browser operations with try-catch and cleanup
- **Page isolation**: Each operation gets a fresh page that's closed after use

### 3. Browser Service Package

The `@agentpass/browser-service` package provides:

- **BrowserManager**: Playwright browser lifecycle management
- **Page Helpers**: Common automation primitives (navigate, fillForm, clickButton, detectCaptcha)
- **Strategies**: High-level login and registration flows with generic selector resolution

## Usage

### Basic Setup

```typescript
import { FallbackAuthService } from "./services/fallback-auth-service.js";
import { PlaywrightBrowserAdapter } from "./adapters/playwright-browser-adapter.js";

// Create the adapter
const browserAdapter = new PlaywrightBrowserAdapter({
  headless: true,
  proxy: "socks5://127.0.0.1:1080", // optional
});

// Wire it into FallbackAuthService
const service = new FallbackAuthService(
  identityService,
  credentialService,
  sessionService,
  webhookService,
  emailAdapter,
  browserAdapter,
);

// Use the service
const result = await service.authenticateOnService(passportId, "https://github.com");

// Clean up when done
await browserAdapter.close();
```

### With Helper Function

For convenience, use the helper function in `demo/browser-integration-demo.ts`:

```typescript
import { createFallbackAuthServiceWithBrowser } from "./demo/browser-integration-demo.js";

const service = createFallbackAuthServiceWithBrowser({ headless: false });
const result = await service.authenticateOnService(passportId, serviceUrl);
await service.close();
```

## Testing

### Unit Tests (Mocked Browser)

The existing tests in `services/fallback-auth-service.test.ts` use mocked `BrowserOperations`:

```typescript
const mockBrowserOps: BrowserOperations = {
  login: vi.fn().mockResolvedValue({ success: true }),
  register: vi.fn().mockResolvedValue({ success: true }),
};

const service = new FallbackAuthService(
  identityService,
  credentialService,
  sessionService,
  webhookService,
  emailAdapter,
  mockBrowserOps,
);
```

### Integration Tests (Real Browser)

Integration tests using the real adapter are in `adapters/playwright-browser-adapter.test.ts`.

To run integration tests:

```bash
INTEGRATION=true pnpm test
```

**Note:** Integration tests are skipped by default since they require a real browser and test services.

## Configuration

### Adapter Options

```typescript
interface PlaywrightBrowserAdapterOptions {
  /** SOCKS5 or HTTP proxy URL (e.g. "socks5://127.0.0.1:1080") */
  proxy?: string;
  /** Launch in headless mode. Defaults to true. */
  headless?: boolean;
}
```

### Session Extraction

The adapter automatically extracts session data after successful login/registration:

**Session Tokens**: Checks these keys in localStorage and sessionStorage:
- `token`
- `auth_token`
- `session_token`
- `access_token`
- `jwt`

**Cookies**: Serializes all cookies into a `name=value; name2=value2` string.

## Future Enhancements

1. **Service-specific strategies**: Add specialized login/registration strategies for popular services (GitHub, GitLab, etc.)
2. **CAPTCHA solving**: Integrate CAPTCHA solving services or manual intervention flow
3. **Session persistence**: Save browser sessions to disk for reuse across runs
4. **Fingerprint resistance**: Add browser fingerprinting countermeasures
5. **Screenshot artifacts**: Save screenshots on failures for debugging

## Troubleshooting

### Browser Launch Fails

- Ensure Playwright browsers are installed: `pnpm exec playwright install chromium`
- Check proxy configuration if using a proxy
- Verify headless mode works on your system

### Session Extraction Returns Empty

- Check that the service uses standard token storage (localStorage/sessionStorage)
- Verify cookies are set correctly
- Try running in non-headless mode to debug: `headless: false`

### Selector Resolution Fails

- The adapter uses generic selectors; some services may need custom strategies
- Check the page HTML to identify correct selectors
- Consider adding service-specific strategies in the browser-service package

## Related Files

- `packages/mcp-server/src/adapters/playwright-browser-adapter.ts` — Adapter implementation
- `packages/mcp-server/src/services/fallback-auth-service.ts` — Service using the adapter
- `packages/browser-service/` — Browser automation package
- `packages/mcp-server/src/demo/browser-integration-demo.ts` — Usage example
