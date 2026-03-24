# AgentPass MCP Server

Identity layer for AI agents via Model Context Protocol. Production-ready with 335+ tests.

## Tools

### Identity Management
- **create_identity** — Create a new agent identity (passport) with Ed25519 key pair
- **list_identities** — List all agent identities
- **get_identity** — Get details of a specific identity
- **delete_identity** — Delete an agent identity
- **revoke_identity** — Revoke an agent identity

### Credentials
- **store_credential** — Store a verifiable credential
- **get_credential** — Retrieve a stored credential
- **list_credentials** — List all stored credentials
- **delete_credential** — Delete a credential

### Email (@agent-mail.xyz)
- **get_email_address** — Get the agent's email address
- **wait_for_email** — Wait for an incoming email
- **read_email** — Read a specific email
- **extract_verification_link** — Extract verification link from email
- **extract_otp_code** — Extract OTP code from email
- **list_emails** — List received emails

### SMS Verification
- **get_phone_number** — Get a phone number for SMS verification
- **wait_for_sms** — Wait for an incoming SMS
- **extract_otp_from_sms** — Extract OTP code from SMS

### Authentication
- **authenticate** — Authenticate with a service
- **check_auth_status** — Check authentication status
- **logout** — Log out from a service

### Authorization & Approval
- **request_approval** — Request approval for an action
- **check_approval** — Check approval status
- **set_permission_level** — Set permission level for actions

### Session Management
- **get_session** — Get current session info
- **list_sessions** — List active sessions
- **invalidate_session** — Invalidate a session

### Browser Automation
- **browser_navigate** — Navigate to a URL
- **browser_click** — Click an element
- **browser_type** — Type text into an element
- **browser_key** — Send keyboard input
- **browser_scroll** — Scroll the page
- **browser_screenshot** — Take a screenshot
- **browser_close** — Close the browser

### CAPTCHA Handling
- **escalate_captcha** — Escalate a CAPTCHA for resolution
- **check_captcha_resolution** — Check if CAPTCHA was resolved
- **get_browser_session_status** — Get browser session status

## Installation

```bash
npx agentpass-mcp serve
```

## Configuration

| Variable | Description |
|---|---|
| `AGENTPASS_API_URL` | API endpoint (default: `https://api.agentpass.space`) |
| `AGENTPASS_PRIVATE_KEY` | Agent's Ed25519 private key |

## Links

- **API:** https://api.agentpass.space
- **Website:** https://agentpass.space
- **Source:** https://github.com/kai-agent-free/AgentPass
