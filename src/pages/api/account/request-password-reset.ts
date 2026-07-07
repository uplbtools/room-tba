import type { APIRoute } from "astro";
import {
  checkRateLimit,
  clientIp,
  rateLimitResponse,
} from "@lib/api/rate-limit";
import { requestPasswordReset } from "@lib/services/admin-user-service";

export const prerender = false;

const LIMIT = { max: 5, windowMs: 60 * 1000 };

/** Public — a locked-out user has no session yet. Always returns success
 * regardless of whether the login matched, to avoid account enumeration. */
export const POST: APIRoute = async ({ request }) => {
  const rate = checkRateLimit(
    `account-request-password-reset:${clientIp(request)}`,
    LIMIT.max,
    LIMIT.windowMs,
  );
  if (!rate.allowed) return rateLimitResponse(rate.resetAt);

  let body: { login?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (typeof body.login !== "string" || !body.login.trim()) {
    return json({ error: "login is required." }, 400);
  }

  try {
    await requestPasswordReset(body.login);
  } catch (error) {
    console.error("Request password reset failed:", error);
    // Still report success to the client — avoid leaking whether the
    // account exists or the email send failed.
  }
  return json({ success: true });
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
