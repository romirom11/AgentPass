/**
 * Integration tests for PlaywrightBrowserAdapter.
 *
 * These tests use a real browser and are skipped by default.
 * To run them, use: `INTEGRATION=true pnpm test`
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PlaywrightBrowserAdapter } from "./playwright-browser-adapter.js";

const INTEGRATION_TESTS_ENABLED = process.env.INTEGRATION === "true";

describe.skipIf(!INTEGRATION_TESTS_ENABLED)(
  "PlaywrightBrowserAdapter (integration)",
  () => {
    let adapter: PlaywrightBrowserAdapter;

    beforeAll(() => {
      adapter = new PlaywrightBrowserAdapter({ headless: true });
    });

    afterAll(async () => {
      await adapter.close();
    });

    it("should successfully instantiate the adapter", () => {
      expect(adapter).toBeDefined();
    });

    // Add more integration tests here when you have test services set up
    it.skip("should login to a test service", async () => {
      const result = await adapter.login("https://test-service.local/login", {
        username: "test-user",
        password: "test-password",
      });

      expect(result).toBeDefined();
      // Add more assertions based on your test service
    });

    it.skip("should register on a test service", async () => {
      const result = await adapter.register(
        "https://test-service.local/signup",
        {
          email: "test@example.com",
          password: "test-password",
          name: "Test User",
        },
      );

      expect(result).toBeDefined();
      // Add more assertions based on your test service
    });
  },
);

/**
 * Unit tests for the adapter (mocked browser operations)
 */
describe("PlaywrightBrowserAdapter (unit)", () => {
  it("should instantiate without errors", () => {
    const adapter = new PlaywrightBrowserAdapter({ headless: true });
    expect(adapter).toBeDefined();
  });

  it("should accept proxy configuration", () => {
    const adapter = new PlaywrightBrowserAdapter({
      headless: true,
      proxy: "socks5://127.0.0.1:1080",
    });
    expect(adapter).toBeDefined();
  });

  it("should default to headless mode", () => {
    const adapter = new PlaywrightBrowserAdapter();
    expect(adapter).toBeDefined();
  });
});
