import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

export interface BrowserLaunchOptions {
  /** SOCKS5 or HTTP proxy URL (e.g. "socks5://127.0.0.1:1080") */
  proxy?: string;
  /** Launch in headless mode. Defaults to true. */
  headless?: boolean;
}

const DEFAULT_VIEWPORT = { width: 1280, height: 720 } as const;

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

/**
 * Find the chromium-headless-shell binary in the Playwright cache.
 *
 * Playwright installs a dedicated headless shell binary that runs without
 * any GUI process — no dock icon, no window, just a headless renderer.
 * The default `chromium.executablePath()` points to the full Chrome for Testing
 * .app bundle which registers as a GUI app on macOS even in headless mode.
 */
function findHeadlessShellExecutable(): string | undefined {
  const cacheDir =
    process.env.PLAYWRIGHT_BROWSERS_PATH ||
    (process.platform === 'darwin'
      ? path.join(process.env.HOME || '', 'Library', 'Caches', 'ms-playwright')
      : path.join(process.env.HOME || '', '.cache', 'ms-playwright'));

  if (!fs.existsSync(cacheDir)) return undefined;

  const entries = fs.readdirSync(cacheDir).filter(e => e.startsWith('chromium_headless_shell-'));
  if (entries.length === 0) return undefined;

  // Pick the latest version (highest revision number)
  entries.sort();
  const shellDir = entries[entries.length - 1];

  // Find the actual binary inside
  const shellBase = path.join(cacheDir, shellDir);
  const platformDirs = fs.readdirSync(shellBase).filter(e => e.startsWith('chrome-headless-shell-'));
  if (platformDirs.length === 0) return undefined;

  const binaryPath = path.join(shellBase, platformDirs[0], 'chrome-headless-shell');
  return fs.existsSync(binaryPath) ? binaryPath : undefined;
}

/**
 * Manages the Playwright browser lifecycle for AgentPass fallback authentication.
 *
 * Typical usage:
 * ```ts
 * const manager = new BrowserManager();
 * await manager.launch();
 * const page = await manager.newPage();
 * // ... interact with the page ...
 * await manager.close();
 * ```
 */
export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  /**
   * Launch a Chromium browser instance.
   *
   * When headless is true, uses the chromium-headless-shell binary if available.
   * This avoids the macOS issue where the full Chrome .app shows a dock icon
   * and window even in headless mode.
   *
   * @param options.proxy  — Optional proxy server URL.
   * @param options.headless — Run headless (default `true`).
   */
  async launch(options?: BrowserLaunchOptions): Promise<void> {
    const headless = options?.headless ?? true;

    // Use the dedicated headless shell to avoid GUI on macOS
    const executablePath = headless ? findHeadlessShellExecutable() : undefined;

    this.browser = await chromium.launch({
      headless,
      ...(executablePath ? { executablePath } : {}),
      ...(options?.proxy ? { proxy: { server: options.proxy } } : {}),
    });

    this.context = await this.browser.newContext({
      viewport: DEFAULT_VIEWPORT,
      userAgent: DEFAULT_USER_AGENT,
    });
  }

  /**
   * Create a new page within the current browser context.
   * The page inherits the viewport and user-agent configured at launch.
   *
   * @throws If the browser has not been launched yet.
   */
  async newPage(): Promise<Page> {
    if (!this.context) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return this.context.newPage();
  }

  /**
   * Close the browser and release all resources.
   * Safe to call even if the browser was never launched.
   * Ensures cleanup happens even if errors occur during closing.
   */
  async close(): Promise<void> {
    const errors: Error[] = [];

    if (this.context) {
      try {
        await this.context.close();
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      } finally {
        this.context = null;
      }
    }

    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      } finally {
        this.browser = null;
      }
    }

    // If any errors occurred during cleanup, log them but don't throw
    // (cleanup should be idempotent and safe)
    if (errors.length > 0) {
      console.warn('[BrowserManager] Errors during cleanup:', errors);
    }
  }

  /** Returns true if a browser instance is currently running. */
  get isRunning(): boolean {
    return this.browser !== null;
  }
}
