/**
 * Playwright-based implementation of the BrowserOperations interface.
 *
 * Adapts the browser-service package (BrowserManager + strategies) to the
 * interface expected by FallbackAuthService.
 */

import type { Page } from "playwright";
import {
  BrowserManager,
  type BrowserLaunchOptions,
  registerOnService,
  loginToService,
} from "@agentpass/browser-service";
import type {
  BrowserOperations,
  LoginResult,
  RegistrationResult,
} from "../services/fallback-auth-service.js";

/**
 * Configuration options for the Playwright browser adapter.
 */
export interface PlaywrightBrowserAdapterOptions {
  /** SOCKS5 or HTTP proxy URL (e.g. "socks5://127.0.0.1:1080") */
  proxy?: string;
  /** Launch in headless mode. Defaults to true. */
  headless?: boolean;
}

/**
 * Playwright-based implementation of BrowserOperations.
 *
 * Manages browser lifecycle internally and delegates login/register operations
 * to the browser-service strategies.
 */
export class PlaywrightBrowserAdapter implements BrowserOperations {
  private manager: BrowserManager;
  private options: BrowserLaunchOptions;

  constructor(options?: PlaywrightBrowserAdapterOptions) {
    this.manager = new BrowserManager();
    this.options = {
      proxy: options?.proxy,
      headless: options?.headless ?? true,
    };
  }

  /**
   * Ensure the browser is launched before operations.
   * Safe to call multiple times — launches only once.
   */
  private async ensureBrowserLaunched(): Promise<void> {
    if (!this.manager.isRunning) {
      await this.manager.launch(this.options);
    }
  }

  /**
   * Extract session token and cookies from the page context.
   *
   * For session token, we check localStorage and sessionStorage for common keys.
   * For cookies, we serialize all cookies into a string.
   */
  private async extractSessionData(
    page: Page,
  ): Promise<{ session_token?: string; cookies?: string }> {
    // Try to extract a session token from storage
    let session_token: string | undefined;
    try {
      const storageKeys = [
        "token",
        "auth_token",
        "session_token",
        "access_token",
        "jwt",
      ];

      // Check localStorage
      for (const key of storageKeys) {
        const value = await page.evaluate((k: string) => {
          return localStorage.getItem(k);
        }, key);
        if (value) {
          session_token = value;
          break;
        }
      }

      // If not found, check sessionStorage
      if (!session_token) {
        for (const key of storageKeys) {
          const value = await page.evaluate((k: string) => {
            return sessionStorage.getItem(k);
          }, key);
          if (value) {
            session_token = value;
            break;
          }
        }
      }
    } catch {
      // Storage access may fail — not critical
    }

    // Extract cookies
    let cookies: string | undefined;
    try {
      const browserContext = page.context();
      const cookieList = await browserContext.cookies();
      if (cookieList.length > 0) {
        cookies = cookieList
          .map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
          .join("; ");
      }
    } catch {
      // Cookie extraction may fail — not critical
    }

    return { session_token, cookies };
  }

  /**
   * Attempt to log in to a service using stored credentials.
   *
   * @param url - The login page URL
   * @param credentials - Username and password
   * @returns LoginResult with success status, session data, or error info
   */
  async login(
    url: string,
    credentials: { username: string; password: string },
  ): Promise<LoginResult> {
    await this.ensureBrowserLaunched();

    let page: Page | null = null;

    try {
      page = await this.manager.newPage();

      const result = await loginToService(page, {
        url,
        username: credentials.username,
        password: credentials.password,
      });

      // Map browser-service LoginResult to FallbackAuthService LoginResult
      if (result.success) {
        const sessionData = await this.extractSessionData(page);
        return {
          success: true,
          session_token: sessionData.session_token,
          cookies: sessionData.cookies,
        };
      }

      // Handle failure cases
      if (result.captcha_detected) {
        return {
          success: false,
          captcha_detected: true,
          captcha_type: result.captcha_type,
          error: result.error,
        };
      }

      return {
        success: false,
        error: result.error ?? "Login failed",
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Login operation failed: ${message}`,
      };
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Attempt to register a new account on a service.
   *
   * @param url - The registration/signup page URL
   * @param options - Email, password, and optional name
   * @returns RegistrationResult with success status, credentials, or error info
   */
  async register(
    url: string,
    options: { email: string; password: string; name?: string },
  ): Promise<RegistrationResult> {
    await this.ensureBrowserLaunched();

    let page: Page | null = null;

    try {
      page = await this.manager.newPage();

      const result = await registerOnService(page, {
        url,
        email: options.email,
        password: options.password,
        name: options.name,
      });

      // Map browser-service RegistrationResult to FallbackAuthService RegistrationResult
      if (result.success) {
        return {
          success: true,
          credentials: result.credentials,
          // Email verification is handled by the service; we assume it's not needed
          // for the generic case. If a service requires it, FallbackAuthService
          // will handle it via the email service adapter.
          needs_email_verification: false,
        };
      }

      // Handle failure cases
      if (result.captcha_detected) {
        return {
          success: false,
          captcha_detected: true,
          captcha_type: result.captcha_type,
          error: result.error,
        };
      }

      return {
        success: false,
        error: result.error ?? "Registration failed",
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Registration operation failed: ${message}`,
      };
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Close the browser and release all resources.
   * Should be called when the adapter is no longer needed.
   */
  async close(): Promise<void> {
    await this.manager.close();
  }
}
