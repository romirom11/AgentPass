/**
 * Browser adapter exports.
 *
 * Provides implementations of the BrowserOperations interface.
 */

export {
  PlaywrightBrowserAdapter,
  type PlaywrightBrowserAdapterOptions,
} from "./playwright-browser-adapter.js";

export {
  AgenticBrowserAdapter,
  type AgenticBrowserAdapterOptions,
} from "./agentic-browser-adapter.js";

export {
  AgenticBrowserLoop,
  type AgenticLoopConfig,
  type AgenticLoopResult,
  type AgenticLoopStatus,
} from "./agentic-browser-loop.js";
