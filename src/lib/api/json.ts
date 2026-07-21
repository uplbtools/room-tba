/**
 * Shared API response helpers.
 *
 * Every API route should use these instead of reinventing
 * `new Response(JSON.stringify(...), { status, headers })`.
 */

/** Standard JSON response. */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Standard error response — `{ error: message }` with the given status. */
export function errorResponse(error: string, status: number): Response {
  return json({ error }, status);
}

/**
 * Parse and validate a numeric `:id` path parameter.
 * Returns the positive integer, or `null` if invalid.
 */
export function parseIdParam(value: string | undefined): number | null {
  const id = parseInt(value ?? "", 10);
  return Number.isNaN(id) || id < 1 ? null : id;
}
