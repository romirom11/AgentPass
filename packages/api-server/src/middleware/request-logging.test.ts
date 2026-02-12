/**
 * Tests for request logging middleware.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Hono } from "hono";
import { requestLogger, getRequestId } from "./request-logging.js";

describe("Request Logger", () => {
  let app: Hono;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    app = new Hono();
    // Spy on console.log to capture structured logs
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("should generate and add X-Request-ID header", async () => {
    app.use("*", requestLogger());
    app.get("/test", (c) => c.json({ success: true }));

    const res = await app.request("/test");

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Request-ID")).toBeTruthy();
    expect(res.headers.get("X-Request-ID")).toHaveLength(16); // 8 bytes = 16 hex chars
  });

  it("should use existing X-Request-ID if provided", async () => {
    app.use("*", requestLogger());
    app.get("/test", (c) => c.json({ success: true }));

    const customRequestId = "custom-request-id-12345";
    const res = await app.request("/test", {
      headers: { "X-Request-ID": customRequestId },
    });

    expect(res.headers.get("X-Request-ID")).toBe(customRequestId);
  });

  it("should log structured request information", async () => {
    app.use("*", requestLogger());
    app.get("/api/test", (c) => c.json({ success: true }));

    await app.request("/api/test");

    expect(consoleSpy).toHaveBeenCalledTimes(1);

    const logEntry = JSON.parse(consoleSpy.mock.calls[0]![0]!);
    expect(logEntry).toMatchObject({
      method: "GET",
      path: "/api/test",
      status: 200,
    });
    expect(logEntry.timestamp).toBeTruthy();
    expect(logEntry.request_id).toBeTruthy();
    expect(logEntry.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it("should log request duration", async () => {
    app.use("*", requestLogger());
    app.get("/slow", async (c) => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return c.json({ success: true });
    });

    await app.request("/slow");

    const logEntry = JSON.parse(consoleSpy.mock.calls[0]![0]!);
    expect(logEntry.duration_ms).toBeGreaterThanOrEqual(40); // Allow some margin
  });

  it("should log error responses", async () => {
    app.use("*", requestLogger());
    app.get("/error", (c) => c.json({ error: "Something went wrong" }, 500));

    await app.request("/error");

    const logEntry = JSON.parse(consoleSpy.mock.calls[0]![0]!);
    expect(logEntry).toMatchObject({
      method: "GET",
      path: "/error",
      status: 500,
    });
  });

  it("should log 404 responses", async () => {
    app.use("*", requestLogger());
    app.get("/exists", (c) => c.json({ success: true }));

    await app.request("/not-found");

    const logEntry = JSON.parse(consoleSpy.mock.calls[0]![0]!);
    expect(logEntry).toMatchObject({
      method: "GET",
      path: "/not-found",
      status: 404,
    });
  });

  it("should make request ID available in context", async () => {
    let contextRequestId: string | undefined;

    app.use("*", requestLogger());
    app.get("/test", (c) => {
      contextRequestId = getRequestId(c);
      return c.json({ success: true });
    });

    const res = await app.request("/test");

    expect(contextRequestId).toBeTruthy();
    expect(res.headers.get("X-Request-ID")).toBe(contextRequestId);
  });

  it("should log different methods correctly", async () => {
    app.use("*", requestLogger());
    app.post("/test", (c) => c.json({ success: true }));
    app.delete("/test", (c) => c.json({ success: true }));

    await app.request("/test", { method: "POST" });
    await app.request("/test", { method: "DELETE" });

    expect(consoleSpy).toHaveBeenCalledTimes(2);

    const log1 = JSON.parse(consoleSpy.mock.calls[0]![0]!);
    const log2 = JSON.parse(consoleSpy.mock.calls[1]![0]!);

    expect(log1.method).toBe("POST");
    expect(log2.method).toBe("DELETE");
  });

  it("should include timestamp in ISO format", async () => {
    app.use("*", requestLogger());
    app.get("/test", (c) => c.json({ success: true }));

    await app.request("/test");

    const logEntry = JSON.parse(consoleSpy.mock.calls[0]![0]!);
    expect(() => new Date(logEntry.timestamp)).not.toThrow();
    expect(logEntry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
