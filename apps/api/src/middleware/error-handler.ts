import type { Context } from "hono";

/**
 * Global error handler matching Java API's error response format.
 */
export function errorHandler(err: Error, c: Context) {
  console.error("Unhandled error:", err);
  return c.text(`Error: ${err.message}`, 500);
}
