// AgentPass Email Service
// Local in-memory implementation; production uses Cloudflare Email Workers.

export { EmailStore } from './email-store.js';
export { generateEmailAddress, isValidAgentEmail } from './email-address.js';
export { CloudflareEmailClient, type EmailMessage } from './cloudflare-client.js';
export type { IncomingEmail, EmailFilter } from './types.js';
