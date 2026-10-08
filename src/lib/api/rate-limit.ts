type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

export type RateLimitResult =
  | { allowed: true; remaining: number; resetAt: number }
  | { allowed: false; remaining: 0; resetAt: number };

/**
 * Any limiter: the in-memory one below or the shared Postgres one in
 * rate-limit-db.ts. Pure helpers (proposal/feedback limits) take one of these
 * so unit tests run against memory while routes pass the shared store.
 */
export type RateLimiter = (
  key: string,
  max: number,
  windowMs: number,
  now?: number,
) => RateLimitResult | Promise<RateLimitResult>;

/**
 * In-memory limiter (per server instance). On serverless each instance has
 * its own Map, so this only suits cheap read endpoints and acts as the
 * fallback when the shared store is unreachable. Auth, signup, reset,
 * feedback and proposals use the shared limiter (rate-limit-db.ts).
 */
export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
  now = Date.now(),
): RateLimitResult {
  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: max - 1, resetAt };
  }

  if (bucket.count >= max) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: max - bucket.count,
    resetAt: bucket.resetAt,
  };
}

/**
 * Client IP for rate-limit keys. Vercel sets `x-vercel-forwarded-for` (and
 * `x-real-ip`) itself; the first `X-Forwarded-For` entry is whatever the
 * client typed, so keying on it let anyone mint a fresh bucket per request.
 */
export function clientIp(request: Request): string {
  for (const header of ["x-vercel-forwarded-for", "x-real-ip"]) {
    const value = request.headers.get(header)?.split(",")[0]?.trim();
    if (value) return value;
  }
  return "unknown";
}

export function rateLimitResponse(
  resetAt: number,
  message = "Too many requests. Wait a few minutes and try again.",
) {
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return new Response(
    JSON.stringify({
      error: message,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    },
  );
}

/** @internal test helper */
export function resetRateLimitsForTests() {
  buckets.clear();
}
