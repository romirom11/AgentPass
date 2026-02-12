import type { Page } from 'playwright';

/** Default navigation timeout in milliseconds. */
const DEFAULT_NAVIGATION_TIMEOUT_MS = 30_000;

/** Default timeout for clicks and form fills in milliseconds. */
const DEFAULT_INTERACTION_TIMEOUT_MS = 10_000;

/** Maximum retry attempts for transient browser errors. */
const MAX_RETRIES = 2;

/** A field descriptor used by {@link fillForm}. */
export interface FormField {
  /** CSS selector for the input element. */
  selector: string;
  /** Value to type into the field. */
  value: string;
}

/** Result returned by {@link detectCaptcha}. */
export interface CaptchaDetectionResult {
  /** Whether a CAPTCHA element was found on the page. */
  detected: boolean;
  /** The provider, if detected. */
  type?: 'recaptcha' | 'hcaptcha' | 'turnstile';
  /** The CSS selector that matched. */
  selector?: string;
}

/** Known CAPTCHA selectors mapped to their provider type. */
const CAPTCHA_SELECTORS: ReadonlyArray<{
  selector: string;
  type: CaptchaDetectionResult['type'];
}> = [
  { selector: '.g-recaptcha', type: 'recaptcha' },
  { selector: '#g-recaptcha', type: 'recaptcha' },
  { selector: 'iframe[src*="recaptcha"]', type: 'recaptcha' },
  { selector: '.h-captcha', type: 'hcaptcha' },
  { selector: 'iframe[src*="hcaptcha"]', type: 'hcaptcha' },
  { selector: '.cf-turnstile', type: 'turnstile' },
  { selector: 'iframe[src*="challenges.cloudflare.com"]', type: 'turnstile' },
];

/**
 * Check if an error is a transient browser error that should be retried.
 */
function isTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes('page crashed') ||
    message.includes('target closed') ||
    message.includes('navigation timeout') ||
    message.includes('net::err_') ||
    message.includes('protocol error') ||
    message.includes('session closed')
  );
}

/**
 * Take a screenshot on error.
 * Returns undefined if screenshot fails (e.g., page is closed).
 */
async function captureErrorScreenshot(page: Page): Promise<Buffer | undefined> {
  try {
    return await page.screenshot({ fullPage: true });
  } catch {
    return undefined;
  }
}

/**
 * Retry wrapper for browser operations that may fail transiently.
 *
 * @param operation - The async operation to execute
 * @param maxRetries - Maximum number of retry attempts
 * @param page - Playwright page instance for error screenshots
 * @returns Result of the operation
 * @throws Error with screenshot attached if all retries fail
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number,
  page: Page,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry if it's not a transient error
      if (!isTransientError(error)) {
        break;
      }

      // Don't retry if we've exhausted attempts
      if (attempt >= maxRetries) {
        break;
      }

      // Wait briefly before retry (exponential backoff: 100ms, 200ms, 400ms)
      await new Promise((resolve) => setTimeout(resolve, 100 * Math.pow(2, attempt)));
    }
  }

  // All retries failed, capture screenshot and throw
  const screenshot = await captureErrorScreenshot(page);
  const error = lastError instanceof Error ? lastError : new Error(String(lastError));

  if (screenshot) {
    // Attach screenshot to error object
    (error as Error & { screenshot?: Buffer }).screenshot = screenshot;
  }

  throw error;
}

/**
 * Navigate to a URL and wait until the network is idle.
 *
 * Automatically retries on transient errors (page crashed, network timeout, etc.)
 * and captures screenshots on failure.
 *
 * @param page    — Playwright page instance.
 * @param url     — Target URL.
 * @param timeout — Max wait in ms (default 30 000).
 */
export async function navigate(
  page: Page,
  url: string,
  timeout: number = DEFAULT_NAVIGATION_TIMEOUT_MS,
): Promise<void> {
  await withRetry(
    async () => {
      await page.goto(url, { waitUntil: 'networkidle', timeout });
    },
    MAX_RETRIES,
    page,
  );
}

/**
 * Fill multiple form fields by typing into each one.
 *
 * Clicks on the element first to focus it, then types the value character by
 * character so that JS event listeners on the page fire correctly.
 *
 * Includes timeout handling and automatic retries for transient errors.
 *
 * @param page   — Playwright page instance.
 * @param fields — Array of `{ selector, value }` descriptors.
 */
export async function fillForm(page: Page, fields: FormField[]): Promise<void> {
  for (const field of fields) {
    await withRetry(
      async () => {
        await page.click(field.selector, { timeout: DEFAULT_INTERACTION_TIMEOUT_MS });
        await page.type(field.selector, field.value, { timeout: DEFAULT_INTERACTION_TIMEOUT_MS });
      },
      MAX_RETRIES,
      page,
    );
  }
}

/**
 * Click a button / link and wait for a potential navigation to settle.
 *
 * Uses `Promise.all` with `waitForNavigation` so the click and the navigation
 * race are started simultaneously, avoiding flaky timeout issues.
 *
 * Includes timeout handling and automatic retries for transient errors.
 *
 * @param page     — Playwright page instance.
 * @param selector — CSS selector of the element to click.
 */
export async function clickButton(page: Page, selector: string): Promise<void> {
  await withRetry(
    async () => {
      await Promise.all([
        page
          .waitForNavigation({ waitUntil: 'networkidle', timeout: DEFAULT_NAVIGATION_TIMEOUT_MS })
          .catch((err) => {
            // Navigation doesn't always happen (e.g. SPA), but log non-timeout errors
            if (err instanceof Error && !err.message.includes('timeout')) {
              console.warn(`[Browser] Navigation after click failed: ${err.message}`);
            }
          }),
        page.click(selector, { timeout: DEFAULT_INTERACTION_TIMEOUT_MS }),
      ]);
    },
    MAX_RETRIES,
    page,
  );
}

/**
 * Take a screenshot of the current page.
 *
 * @param page — Playwright page instance.
 * @param path — Optional file path. When omitted the screenshot is returned
 *               as a `Buffer` only (not saved to disk).
 * @returns The screenshot as a `Buffer`.
 */
export async function screenshot(page: Page, path?: string): Promise<Buffer> {
  const options: Parameters<Page['screenshot']>[0] = { fullPage: true };
  if (path) {
    options.path = path;
  }
  return page.screenshot(options) as Promise<Buffer>;
}

/**
 * Wait for an element matching `selector` to appear in the DOM.
 *
 * Includes timeout handling and automatic retries for transient errors.
 *
 * @param page     — Playwright page instance.
 * @param selector — CSS selector.
 * @param timeout  — Max wait in ms (default 30 000).
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeout: number = DEFAULT_NAVIGATION_TIMEOUT_MS,
): Promise<void> {
  await withRetry(
    async () => {
      await page.waitForSelector(selector, { timeout });
    },
    MAX_RETRIES,
    page,
  );
}

/**
 * Extract the visible text content from the page body.
 *
 * @param page — Playwright page instance.
 * @returns Plain-text content of `document.body`.
 */
export async function getPageContent(page: Page): Promise<string> {
  return page.innerText('body');
}

/**
 * Detect common CAPTCHA providers on the page.
 *
 * Checks for reCAPTCHA, hCaptcha, and Cloudflare Turnstile by probing known
 * CSS selectors and iframe `src` attributes.
 *
 * @param page — Playwright page instance.
 * @returns Detection result with the matched type and selector when found.
 */
export async function detectCaptcha(page: Page): Promise<CaptchaDetectionResult> {
  for (const entry of CAPTCHA_SELECTORS) {
    const element = await page.$(entry.selector);
    if (element) {
      return { detected: true, type: entry.type, selector: entry.selector };
    }
  }
  return { detected: false };
}
