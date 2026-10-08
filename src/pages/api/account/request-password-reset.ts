import type { APIRoute } from "astro";
import { clientIp, rateLimitResponse } from "@lib/api/rate-limit";
import { sharedRateLimit } from "@lib/api/rate-limit-db";
import { accountKey } from "@lib/api/rate-limit-shared";
import { requestPasswordReset } from "@lib/services/admin-user-service";
import { verifyTurnstileToken } from "@lib/turnstile";

export const prerender = false;

const IP_LIMIT = { max: 5, windowMs: 60 * 1000 };
/** One reset mail per account per window, whoever asks for it. */
const ACCOUNT_LIMIT = { max: 1, windowMs: 2 * 60 * 1000 };

/** Public — a locked-out user has no session yet. Always returns success
 * regardless of whether the login matched, to avoid account enumeration.
 *
 * Guarded like sign-in: shared IP limit, Turnstile, and a per-account
 * cooldown so nobody can flood a mailbox with reset links by rotating IPs.
 * The cooldown is silent (still "success") for the same enumeration reason. */
export const POST: APIRoute = async ({ request }) => {
  const ip = clientIp(request);
  const { ASTRO_E2E_SKIP_LOGIN_RATE_LIMIT } = process.env;
  const skipRateLimit = ASTRO_E2E_SKIP_LOGIN_RATE_LIMIT === "1";
  if (!skipRateLimit) {
    const rate = await sharedRateLimit(
      `account-request-password-reset:${ip}`,
      IP_LIMIT.max,
      IP_LIMIT.windowMs,
    );
    if (!rate.allowed) return rateLimitResponse(rate.resetAt);
  }

  let body: { login?: string; turnstileToken?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (typeof body.login !== "string" || !body.login.trim()) {
    return json({ error: "login is required." }, 400);
  }

  const turnstileOk = await verifyTurnstileToken(
    typeof body.turnstileToken === "string" ? body.turnstileToken : null,
    ip,
  );
  if (!turnstileOk) {
    return json(
      { error: "Verification failed. Refresh the page and try again." },
      400,
    );
  }

  const key = accountKey("password-reset", body.login);
  const accountRate = skipRateLimit
    ? { allowed: true }
    : await sharedRateLimit(key, ACCOUNT_LIMIT.max, ACCOUNT_LIMIT.windowMs);
  // A login that is cooling down from failed sign-ins can still ask for a
  // reset: that is the way out of the lock, so only the mail cooldown applies.
  if (accountRate.allowed) {
    try {
      await requestPasswordReset(body.login);
    } catch (error) {
      console.error("Request password reset failed:", error);
      // Still report success to the client — avoid leaking whether the
      // account exists or the email send failed.
    }
  }
  return json({ success: true });
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
