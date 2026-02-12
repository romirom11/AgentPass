/**
 * Request logging middleware for Hono.
 *
 * Logs structured request information including method, path, status,
 * and duration. Also generates and propagates a request ID for distributed tracing.
 */

import type { Context, Next } from "hono";
import { randomBytes } from "node:crypto";

/**
 * Generate a unique request ID.
 */
function generateRequestId(): string {
  return randomBytes(8).toString("hex");
}

/**
 * Request logging middleware.
 *
 * - Generates a unique X-Request-ID for each request
 * - Logs structured request details (method, path, status, duration)
 * - Adds X-Request-ID to response headers for client tracking
 */
export function requestLogger() {
  return async (c: Context, next: Next) => {
    const requestId = c.req.header("x-request-id") ?? generateRequestId();
    const startTime = Date.now();

    // Store request ID in context for potential use by other middleware
    c.set("requestId", requestId);

    // Add request ID to response headers
    c.header("X-Request-ID", requestId);

    try {
      await next();
    } finally {
      const duration = Date.now() - startTime;
      const method = c.req.method;
      const path = c.req.path;
      const status = c.res.status;

      // Structured log entry
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          request_id: requestId,
          method,
          path,
          status,
          duration_ms: duration,
        }),
      );
    }
  };
}

/**
 * Get the request ID from the context.
 */
export function getRequestId(c: Context): string | undefined {
  return c.get("requestId");
}
