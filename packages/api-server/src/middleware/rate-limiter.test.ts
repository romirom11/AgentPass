/**
 * Tests for rate limiting middleware.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import { rateLimiter, destroyRateLimiter } from "./rate-limiter.js";

describe("Rate Limiter", () => {
  let app: Hono;
  let originalTrustProxy: string | undefined;

  beforeEach(() => {
    app = new Hono();
    // Enable TRUST_PROXY for tests to use x-real-ip and x-forwarded-for headers
    originalTrustProxy = process.env.TRUST_PROXY;
    process.env.TRUST_PROXY = 'true';
  });

  afterEach(() => {
    destroyRateLimiter();
    // Restore original TRUST_PROXY setting
    if (originalTrustProxy === undefined) {
      delete process.env.TRUST_PROXY;
    } else {
      process.env.TRUST_PROXY = originalTrustProxy;
    }
  });

  it("should allow requests within rate limit", async () => {
    app.use("*", rateLimiter({ maxRequests: 5, windowMs: 60000 }));
    app.get("/test", (c) => c.json({ success: true }));

    // Make 5 requests (all should succeed)
    for (let i = 0; i < 5; i++) {
      const res = await app.request("/test", {
        headers: { "x-real-ip": "192.168.1.1" },
      });
      expect(res.status).toBe(200);
    }
  });

  it("should block requests exceeding rate limit", async () => {
    app.use("*", rateLimiter({ maxRequests: 3, windowMs: 60000 }));
    app.get("/test", (c) => c.json({ success: true }));

    const ip = "192.168.1.2";

    // First 3 requests should succeed
    for (let i = 0; i < 3; i++) {
      const res = await app.request("/test", {
        headers: { "x-real-ip": ip },
      });
      expect(res.status).toBe(200);
    }

    // 4th request should be rate limited
    const res = await app.request("/test", {
      headers: { "x-real-ip": ip },
    });
    expect(res.status).toBe(429);

    const body = await res.json();
    expect(body).toMatchObject({
      error: "Rate limit exceeded",
      code: "RATE_LIMITED",
    });
    expect(body.retry_after).toBeGreaterThan(0);
  });

  it("should track rate limits per IP address", async () => {
    app.use("*", rateLimiter({ maxRequests: 2, windowMs: 60000 }));
    app.get("/test", (c) => c.json({ success: true }));

    // IP 1: make 2 requests (both succeed)
    for (let i = 0; i < 2; i++) {
      const res = await app.request("/test", {
        headers: { "x-real-ip": "10.0.0.1" },
      });
      expect(res.status).toBe(200);
    }

    // IP 2: make 2 requests (both succeed, independent limit)
    for (let i = 0; i < 2; i++) {
      const res = await app.request("/test", {
        headers: { "x-real-ip": "10.0.0.2" },
      });
      expect(res.status).toBe(200);
    }

    // IP 1: 3rd request should be blocked
    const res1 = await app.request("/test", {
      headers: { "x-real-ip": "10.0.0.1" },
    });
    expect(res1.status).toBe(429);

    // IP 2: 3rd request should also be blocked
    const res2 = await app.request("/test", {
      headers: { "x-real-ip": "10.0.0.2" },
    });
    expect(res2.status).toBe(429);
  });

  it("should track rate limits per endpoint", async () => {
    app.use("*", rateLimiter({ maxRequests: 2, windowMs: 60000 }));
    app.get("/endpoint-a", (c) => c.json({ endpoint: "a" }));
    app.get("/endpoint-b", (c) => c.json({ endpoint: "b" }));

    const ip = "10.0.0.3";

    // Make 2 requests to endpoint A (both succeed)
    for (let i = 0; i < 2; i++) {
      const res = await app.request("/endpoint-a", {
        headers: { "x-real-ip": ip },
      });
      expect(res.status).toBe(200);
    }

    // Make 2 requests to endpoint B (both succeed, separate limit)
    for (let i = 0; i < 2; i++) {
      const res = await app.request("/endpoint-b", {
        headers: { "x-real-ip": ip },
      });
      expect(res.status).toBe(200);
    }

    // 3rd request to endpoint A should be blocked
    const resA = await app.request("/endpoint-a", {
      headers: { "x-real-ip": ip },
    });
    expect(resA.status).toBe(429);

    // 3rd request to endpoint B should also be blocked
    const resB = await app.request("/endpoint-b", {
      headers: { "x-real-ip": ip },
    });
    expect(resB.status).toBe(429);
  });

  it("should refill tokens over time", async () => {
    // Very short window for testing
    app.use("*", rateLimiter({ maxRequests: 2, windowMs: 100 }));
    app.get("/test", (c) => c.json({ success: true }));

    const ip = "10.0.0.4";

    // Consume both tokens
    for (let i = 0; i < 2; i++) {
      const res = await app.request("/test", {
        headers: { "x-real-ip": ip },
      });
      expect(res.status).toBe(200);
    }

    // 3rd request should be blocked
    const res1 = await app.request("/test", {
      headers: { "x-real-ip": ip },
    });
    expect(res1.status).toBe(429);

    // Wait for window to elapse
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Tokens should be refilled, request should succeed
    const res2 = await app.request("/test", {
      headers: { "x-real-ip": ip },
    });
    expect(res2.status).toBe(200);
  });

  it("should handle X-Forwarded-For header", async () => {
    app.use("*", rateLimiter({ maxRequests: 2, windowMs: 60000 }));
    app.get("/test", (c) => c.json({ success: true }));

    // Make requests with X-Forwarded-For header
    const forwardedIp = "203.0.113.1";

    for (let i = 0; i < 2; i++) {
      const res = await app.request("/test", {
        headers: { "x-forwarded-for": forwardedIp },
      });
      expect(res.status).toBe(200);
    }

    // 3rd request should be blocked
    const res = await app.request("/test", {
      headers: { "x-forwarded-for": forwardedIp },
    });
    expect(res.status).toBe(429);
  });

  it("should handle multiple IPs in X-Forwarded-For", async () => {
    app.use("*", rateLimiter({ maxRequests: 2, windowMs: 60000 }));
    app.get("/test", (c) => c.json({ success: true }));

    // X-Forwarded-For with multiple IPs (should use the first one)
    const forwardedHeader = "203.0.113.5, 192.168.1.1, 10.0.0.1";

    for (let i = 0; i < 2; i++) {
      const res = await app.request("/test", {
        headers: { "x-forwarded-for": forwardedHeader },
      });
      expect(res.status).toBe(200);
    }

    // 3rd request should be blocked
    const res = await app.request("/test", {
      headers: { "x-forwarded-for": forwardedHeader },
    });
    expect(res.status).toBe(429);
  });

  it("should return correct retry_after value", async () => {
    app.use("*", rateLimiter({ maxRequests: 1, windowMs: 10000 }));
    app.get("/test", (c) => c.json({ success: true }));

    const ip = "10.0.0.5";

    // Consume the single token
    await app.request("/test", { headers: { "x-real-ip": ip } });

    // Get rate limited
    const res = await app.request("/test", {
      headers: { "x-real-ip": ip },
    });

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.retry_after).toBeGreaterThan(0);
    expect(body.retry_after).toBeLessThanOrEqual(10);
  });

  it("should track different HTTP methods separately", async () => {
    app.use("*", rateLimiter({ maxRequests: 2, windowMs: 60000 }));
    app.get("/test", (c) => c.json({ method: "GET" }));
    app.post("/test", (c) => c.json({ method: "POST" }));

    const ip = "10.0.0.6";

    // Make 2 GET requests (both succeed)
    for (let i = 0; i < 2; i++) {
      const res = await app.request("/test", {
        method: "GET",
        headers: { "x-real-ip": ip },
      });
      expect(res.status).toBe(200);
    }

    // Make 2 POST requests (both succeed, separate limit)
    for (let i = 0; i < 2; i++) {
      const res = await app.request("/test", {
        method: "POST",
        headers: { "x-real-ip": ip },
      });
      expect(res.status).toBe(200);
    }

    // 3rd GET should be blocked
    const resGet = await app.request("/test", {
      method: "GET",
      headers: { "x-real-ip": ip },
    });
    expect(resGet.status).toBe(429);

    // 3rd POST should be blocked
    const resPost = await app.request("/test", {
      method: "POST",
      headers: { "x-real-ip": ip },
    });
    expect(resPost.status).toBe(429);
  });
});
