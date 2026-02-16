/**
 * Agentic browser loop powered by Claude's computer_use capability.
 *
 * Takes a Playwright page, sends screenshots to Claude, and executes the
 * returned actions (click, type, scroll, etc.) in a loop until the task
 * completes, a CAPTCHA is detected, or the iteration limit is reached.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  BetaMessageParam,
  BetaToolResultBlockParam,
} from "@anthropic-ai/sdk/resources/beta/messages/messages.js";
import type { Page } from "playwright";
import { detectCaptcha } from "@agentpass/browser-service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgenticLoopStatus =
  | "success"
  | "captcha_detected"
  | "failed"
  | "needs_email_verification";

export interface AgenticLoopResult {
  status: AgenticLoopStatus;
  captcha_type?: string;
  error?: string;
  iterations_used: number;
}

export interface AgenticLoopConfig {
  /** The Playwright page to operate on (already navigated to target URL). */
  page: Page;
  /** System prompt instructing Claude what task to perform. */
  systemPrompt: string;
  /** Initial user message describing the task. */
  taskDescription: string;
  /** Maximum screenshot→action iterations. */
  maxIterations: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCREENSHOT_QUALITY = 75;
const MODEL = "claude-sonnet-4-5-20250514";
const MAX_API_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 1000;
const ACTION_DELAY_MS = 500;
const COMPUTER_USE_BETA = "computer-use-2025-01-24";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Take a JPEG screenshot of the page and return it as base64.
 */
async function takeScreenshot(page: Page): Promise<string> {
  const buffer = await page.screenshot({
    type: "jpeg",
    quality: SCREENSHOT_QUALITY,
    fullPage: false,
  });
  return buffer.toString("base64");
}

/**
 * Try to parse a termination JSON block from Claude's text response.
 *
 * Claude reports task outcome in a fenced JSON block:
 * ```json
 * { "status": "success" | "captcha_detected" | "failed" | "needs_email_verification" }
 * ```
 */
function parseTermination(
  text: string,
): { status: AgenticLoopStatus; captcha_type?: string; error?: string } | null {
  // Try fenced JSON block first
  const fencedMatch = text.match(
    /```json\s*\n?\s*(\{[\s\S]*?\})\s*\n?\s*```/,
  );
  if (fencedMatch) {
    try {
      const parsed = JSON.parse(fencedMatch[1]);
      if (parsed.status) {
        return {
          status: parsed.status as AgenticLoopStatus,
          captcha_type: parsed.captcha_type,
          error: parsed.error,
        };
      }
    } catch {
      // Not valid JSON — continue
    }
  }

  // Try inline JSON object
  const inlineMatch = text.match(
    /\{\s*"status"\s*:\s*"(success|captcha_detected|failed|needs_email_verification)"[^}]*\}/,
  );
  if (inlineMatch) {
    try {
      const parsed = JSON.parse(inlineMatch[0]);
      return {
        status: parsed.status as AgenticLoopStatus,
        captcha_type: parsed.captcha_type,
        error: parsed.error,
      };
    } catch {
      // Not valid JSON — continue
    }
  }

  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientApiError(error: unknown): boolean {
  if (error instanceof Anthropic.APIError) {
    return (
      error.status === 429 ||
      error.status === 500 ||
      error.status === 502 ||
      error.status === 503 ||
      error.status === 529
    );
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes("econnreset") || msg.includes("socket hang up");
  }
  return false;
}

// ---------------------------------------------------------------------------
// Action executor
// ---------------------------------------------------------------------------

interface ComputerAction {
  action: string;
  coordinate?: [number, number];
  text?: string;
  duration?: number;
  scroll_direction?: "up" | "down" | "left" | "right";
  scroll_amount?: number;
  start_coordinate?: [number, number];
  end_coordinate?: [number, number];
}

/**
 * Execute a single computer_use action on the Playwright page.
 * Returns true if a new screenshot should be taken after this action.
 */
async function executeAction(
  page: Page,
  action: ComputerAction,
): Promise<boolean> {
  switch (action.action) {
    case "left_click": {
      if (!action.coordinate) break;
      const [x, y] = action.coordinate;
      await page.mouse.click(x, y, { button: "left" });
      await sleep(ACTION_DELAY_MS);
      return true;
    }

    case "right_click": {
      if (!action.coordinate) break;
      const [x, y] = action.coordinate;
      await page.mouse.click(x, y, { button: "right" });
      await sleep(ACTION_DELAY_MS);
      return true;
    }

    case "double_click": {
      if (!action.coordinate) break;
      const [x, y] = action.coordinate;
      await page.mouse.dblclick(x, y);
      await sleep(ACTION_DELAY_MS);
      return true;
    }

    case "middle_click": {
      if (!action.coordinate) break;
      const [x, y] = action.coordinate;
      await page.mouse.click(x, y, { button: "middle" });
      await sleep(ACTION_DELAY_MS);
      return true;
    }

    case "type": {
      if (!action.text) break;
      await page.keyboard.type(action.text, { delay: 30 });
      await sleep(ACTION_DELAY_MS);
      return true;
    }

    case "key": {
      if (!action.text) break;
      const keyMap: Record<string, string> = {
        Return: "Enter",
        return: "Enter",
        space: " ",
        Space: " ",
        BackSpace: "Backspace",
      };
      const key = keyMap[action.text] ?? action.text;
      await page.keyboard.press(key);
      await sleep(ACTION_DELAY_MS);
      return true;
    }

    case "scroll": {
      const direction = action.scroll_direction ?? "down";
      const amount = action.scroll_amount ?? 3;
      const deltaMultiplier = 100;
      let deltaX = 0;
      let deltaY = 0;

      switch (direction) {
        case "down":
          deltaY = amount * deltaMultiplier;
          break;
        case "up":
          deltaY = -(amount * deltaMultiplier);
          break;
        case "right":
          deltaX = amount * deltaMultiplier;
          break;
        case "left":
          deltaX = -(amount * deltaMultiplier);
          break;
      }

      if (action.coordinate) {
        await page.mouse.move(action.coordinate[0], action.coordinate[1]);
      }
      await page.mouse.wheel(deltaX, deltaY);
      await sleep(ACTION_DELAY_MS);
      return true;
    }

    case "mouse_move": {
      if (!action.coordinate) break;
      const [x, y] = action.coordinate;
      await page.mouse.move(x, y);
      return true;
    }

    case "left_click_drag": {
      if (!action.start_coordinate || !action.end_coordinate) break;
      const [sx, sy] = action.start_coordinate;
      const [ex, ey] = action.end_coordinate;
      await page.mouse.move(sx, sy);
      await page.mouse.down();
      await page.mouse.move(ex, ey);
      await page.mouse.up();
      await sleep(ACTION_DELAY_MS);
      return true;
    }

    case "triple_click": {
      if (!action.coordinate) break;
      const [x, y] = action.coordinate;
      await page.mouse.click(x, y, { clickCount: 3 });
      await sleep(ACTION_DELAY_MS);
      return true;
    }

    case "screenshot": {
      return true;
    }

    case "wait": {
      const ms = (action.duration ?? 2) * 1000;
      await sleep(ms);
      return true;
    }

    default:
      console.warn(
        `[AgenticBrowserLoop] Unknown action: ${action.action}`,
      );
      return false;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

export class AgenticBrowserLoop {
  private readonly client: Anthropic;

  constructor(anthropicApiKey?: string) {
    const apiKey = anthropicApiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is required for agentic browser mode. " +
          "Set it via constructor or ANTHROPIC_API_KEY environment variable.",
      );
    }
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Run the agentic browser loop.
   *
   * Takes a screenshot, sends it to Claude, executes returned actions,
   * and repeats until the task is complete or the limit is reached.
   */
  async run(config: AgenticLoopConfig): Promise<AgenticLoopResult> {
    const { page, systemPrompt, taskDescription, maxIterations } = config;

    const viewport = page.viewportSize() ?? { width: 1280, height: 720 };

    let screenshotBase64 = await takeScreenshot(page);

    const messages: BetaMessageParam[] = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: taskDescription,
          },
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: screenshotBase64,
            },
          },
        ],
      },
    ];

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let response: Anthropic.Beta.Messages.BetaMessage;
      try {
        response = await this.callWithRetry(
          systemPrompt,
          messages,
          viewport,
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          status: "failed",
          error: `Claude API error: ${message}`,
          iterations_used: iteration + 1,
        };
      }

      let hasToolUse = false;
      let shouldTakeScreenshot = false;

      for (const block of response.content) {
        if (block.type === "text") {
          const termination = parseTermination(block.text);
          if (termination) {
            return {
              ...termination,
              iterations_used: iteration + 1,
            };
          }
        }

        if (block.type === "tool_use" && block.name === "computer") {
          hasToolUse = true;
          const input = block.input as ComputerAction;

          try {
            const needsScreenshot = await executeAction(page, input);
            if (needsScreenshot) {
              shouldTakeScreenshot = true;
            }
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.warn(
              `[AgenticBrowserLoop] Action "${input.action}" failed: ${message}`,
            );
            shouldTakeScreenshot = true;
          }

          try {
            const captchaResult = await detectCaptcha(page);
            if (captchaResult.detected) {
              return {
                status: "captcha_detected",
                captcha_type: captchaResult.type,
                iterations_used: iteration + 1,
              };
            }
          } catch {
            // CAPTCHA detection failure is non-critical
          }
        }
      }

      if (hasToolUse) {
        try {
          await page.waitForLoadState("domcontentloaded", { timeout: 3000 });
        } catch {
          // Timeout is fine — page may already be loaded
        }

        if (shouldTakeScreenshot) {
          screenshotBase64 = await takeScreenshot(page);
        }

        const toolResults: BetaToolResultBlockParam[] = [];
        for (const block of response.content) {
          if (block.type === "tool_use") {
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/jpeg",
                    data: screenshotBase64,
                  },
                },
              ],
            });
          }
        }

        // Add assistant response and tool results to conversation.
        // Cast content to the expected param type — the API response content blocks
        // are structurally compatible with BetaContentBlockParam for tool_use and text.
        messages.push({
          role: "assistant",
          content: response.content as unknown as BetaMessageParam["content"],
        });
        messages.push({
          role: "user",
          content: toolResults,
        });
      } else {
        if (response.stop_reason === "end_turn") {
          return {
            status: "failed",
            error:
              "Claude ended the conversation without reporting task outcome.",
            iterations_used: iteration + 1,
          };
        }
      }
    }

    return {
      status: "failed",
      error: `Maximum iterations (${maxIterations}) reached without task completion.`,
      iterations_used: maxIterations,
    };
  }

  /**
   * Call the Claude beta API with retries on transient errors.
   */
  private async callWithRetry(
    systemPrompt: string,
    messages: BetaMessageParam[],
    viewport: { width: number; height: number },
  ): Promise<Anthropic.Beta.Messages.BetaMessage> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_API_RETRIES; attempt++) {
      try {
        return await this.client.beta.messages.create({
          model: MODEL,
          max_tokens: 4096,
          system: systemPrompt,
          betas: [COMPUTER_USE_BETA],
          tools: [
            {
              type: "computer_20250124",
              name: "computer",
              display_width_px: viewport.width,
              display_height_px: viewport.height,
            },
          ],
          messages,
        });
      } catch (error: unknown) {
        lastError = error;

        if (!isTransientApiError(error) || attempt >= MAX_API_RETRIES) {
          throw error;
        }

        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `[AgenticBrowserLoop] API call failed (attempt ${attempt + 1}/${MAX_API_RETRIES + 1}), retrying in ${delay}ms...`,
        );
        await sleep(delay);
      }
    }

    throw lastError;
  }
}
