/**
 * Agentic browser adapter that uses Claude's computer_use capability
 * to navigate web pages intelligently instead of hardcoded CSS selectors.
 *
 * Implements the BrowserOperations interface so it can be swapped in
 * for the classic PlaywrightBrowserAdapter.
 */

import type { Page } from "playwright";
import { BrowserManager, type BrowserLaunchOptions } from "@agentpass/browser-service";
import type {
  BrowserOperations,
  LoginResult,
  RegistrationResult,
} from "../services/fallback-auth-service.js";
import {
  AgenticBrowserLoop,
  type AgenticLoopResult,
} from "./agentic-browser-loop.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface AgenticBrowserAdapterOptions {
  /** SOCKS5 or HTTP proxy URL. */
  proxy?: string;
  /** Launch in headless mode. Defaults to true. */
  headless?: boolean;
  /** Anthropic API key. Falls back to ANTHROPIC_API_KEY env var. */
  anthropicApiKey?: string;
}

const LOGIN_MAX_ITERATIONS = 10;
const REGISTER_MAX_ITERATIONS = 15;

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

const LOGIN_SYSTEM_PROMPT = `You are an AI agent automating a web browser to log in to a website.

RULES:
1. Carefully examine each screenshot before acting.
2. Click on input fields before typing into them.
3. Handle multi-step login flows (e.g., username first, then password on next page).
4. If you see a CAPTCHA challenge (reCAPTCHA, hCaptcha, Turnstile, image grid, puzzle, "verify you are human", etc.), report it immediately — do NOT attempt to solve it.
5. Look for login/sign-in buttons and forms. If the page redirects to a different login page, follow it.
6. After submitting credentials, wait for the page to load and check if login was successful (look for user profile, dashboard, account menu, etc.).
7. If you see error messages like "incorrect password" or "account not found", report failure.

TERMINATION — When the task is complete, output EXACTLY this JSON block:
\`\`\`json
{ "status": "success" }
\`\`\`

If a CAPTCHA is detected:
\`\`\`json
{ "status": "captcha_detected", "captcha_type": "<type>" }
\`\`\`

If login failed:
\`\`\`json
{ "status": "failed", "error": "<brief description>" }
\`\`\``;

const REGISTER_SYSTEM_PROMPT = `You are an AI agent automating a web browser to register a new account on a website.

RULES:
1. Carefully examine each screenshot before acting.
2. Click on input fields before typing into them.
3. Handle multi-step registration wizards — continue through each step.
4. Fill in all required fields: name, email, password, etc.
5. Check any "I agree to terms" or "I accept" checkboxes.
6. If you see a CAPTCHA challenge (reCAPTCHA, hCaptcha, Turnstile, image grid, puzzle, "verify you are human", etc.), report it immediately — do NOT attempt to solve it.
7. If the site asks you to confirm a password, re-enter the same password.
8. After submitting, check if registration was successful or if email verification is needed.
9. If you see "check your email" or "verify your email" messages, report needs_email_verification.

TERMINATION — When the task is complete, output EXACTLY this JSON block:
\`\`\`json
{ "status": "success" }
\`\`\`

If email verification is needed:
\`\`\`json
{ "status": "needs_email_verification" }
\`\`\`

If a CAPTCHA is detected:
\`\`\`json
{ "status": "captcha_detected", "captcha_type": "<type>" }
\`\`\`

If registration failed:
\`\`\`json
{ "status": "failed", "error": "<brief description>" }
\`\`\``;

// ---------------------------------------------------------------------------
// Session extraction helpers
// ---------------------------------------------------------------------------

const STORAGE_TOKEN_KEYS = [
  "token",
  "auth_token",
  "session_token",
  "access_token",
  "jwt",
];

async function extractSessionData(
  page: Page,
): Promise<{ session_token?: string; cookies?: string }> {
  let session_token: string | undefined;

  // Check localStorage
  try {
    for (const key of STORAGE_TOKEN_KEYS) {
      const value = await page.evaluate(
        (k: string) => localStorage.getItem(k),
        key,
      );
      if (value) {
        session_token = value;
        break;
      }
    }
  } catch {
    // Storage access may fail
  }

  // Check sessionStorage
  if (!session_token) {
    try {
      for (const key of STORAGE_TOKEN_KEYS) {
        const value = await page.evaluate(
          (k: string) => sessionStorage.getItem(k),
          key,
        );
        if (value) {
          session_token = value;
          break;
        }
      }
    } catch {
      // Storage access may fail
    }
  }

  // Extract cookies
  let cookies: string | undefined;
  try {
    const cookieList = await page.context().cookies();
    if (cookieList.length > 0) {
      cookies = cookieList
        .map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
        .join("; ");
    }
  } catch {
    // Cookie extraction may fail
  }

  return { session_token, cookies };
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class AgenticBrowserAdapter implements BrowserOperations {
  private readonly manager: BrowserManager;
  private readonly launchOptions: BrowserLaunchOptions;
  private readonly loop: AgenticBrowserLoop;

  constructor(options?: AgenticBrowserAdapterOptions) {
    this.manager = new BrowserManager();
    this.launchOptions = {
      proxy: options?.proxy,
      headless: options?.headless ?? true,
    };
    this.loop = new AgenticBrowserLoop(options?.anthropicApiKey);
  }

  private async ensureBrowserLaunched(): Promise<void> {
    if (!this.manager.isRunning) {
      await this.manager.launch(this.launchOptions);
    }
  }

  async login(
    url: string,
    credentials: { username: string; password: string },
  ): Promise<LoginResult> {
    await this.ensureBrowserLaunched();

    let page: Page | null = null;

    try {
      page = await this.manager.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });

      const taskDescription =
        `Log in to this website using these credentials:\n` +
        `- Username/Email: ${credentials.username}\n` +
        `- Password: ${credentials.password}\n\n` +
        `Find the login form, enter the credentials, and submit. ` +
        `Verify that login was successful.`;

      const result = await this.loop.run({
        page,
        systemPrompt: LOGIN_SYSTEM_PROMPT,
        taskDescription,
        maxIterations: LOGIN_MAX_ITERATIONS,
      });

      return this.mapLoginResult(result, page);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Agentic login failed: ${message}`,
      };
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  async register(
    url: string,
    options: { email: string; password: string; name?: string },
  ): Promise<RegistrationResult> {
    await this.ensureBrowserLaunched();

    let page: Page | null = null;

    try {
      page = await this.manager.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });

      const namePart = options.name
        ? `- Full Name: ${options.name}\n`
        : "";
      const taskDescription =
        `Register a new account on this website with:\n` +
        `- Email: ${options.email}\n` +
        `- Password: ${options.password}\n` +
        namePart +
        `\nFind the registration/signup form, fill in all required fields, ` +
        `agree to any terms if required, and submit. ` +
        `Check if the registration was successful or if email verification is needed.`;

      const result = await this.loop.run({
        page,
        systemPrompt: REGISTER_SYSTEM_PROMPT,
        taskDescription,
        maxIterations: REGISTER_MAX_ITERATIONS,
      });

      return this.mapRegistrationResult(result, options);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Agentic registration failed: ${message}`,
      };
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  async close(): Promise<void> {
    await this.manager.close();
  }

  // -----------------------------------------------------------------------
  // Result mappers
  // -----------------------------------------------------------------------

  private async mapLoginResult(
    result: AgenticLoopResult,
    page: Page,
  ): Promise<LoginResult> {
    if (result.status === "success") {
      const sessionData = await extractSessionData(page);
      return {
        success: true,
        session_token: sessionData.session_token,
        cookies: sessionData.cookies,
      };
    }

    if (result.status === "captcha_detected") {
      return {
        success: false,
        captcha_detected: true,
        captcha_type: result.captcha_type,
        error: "CAPTCHA detected during login",
      };
    }

    return {
      success: false,
      error: result.error ?? "Login failed",
    };
  }

  private mapRegistrationResult(
    result: AgenticLoopResult,
    options: { email: string; password: string; name?: string },
  ): RegistrationResult {
    if (result.status === "success" || result.status === "needs_email_verification") {
      return {
        success: true,
        credentials: {
          username: options.email,
          password: options.password,
          email: options.email,
        },
        needs_email_verification: result.status === "needs_email_verification",
      };
    }

    if (result.status === "captcha_detected") {
      return {
        success: false,
        captcha_detected: true,
        captcha_type: result.captcha_type,
        error: "CAPTCHA detected during registration",
      };
    }

    return {
      success: false,
      error: result.error ?? "Registration failed",
    };
  }
}
