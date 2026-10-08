import type { APIRoute } from "astro";
import { clientIp, rateLimitResponse } from "@lib/api/rate-limit";
import { accountBackoff, sharedRateLimit } from "@lib/api/rate-limit-db";
import { accountKey } from "@lib/api/rate-limit-shared";
import {
  AccountActionError,
  confirmPasswordReset,
} from "@lib/services/admin-user-service";

export const prerender = false;

const LIMIT = { max: 8, windowMs: 60 * 1000 };

export const POST: APIRoute = async ({ request }) => {
  const rate = await sharedRateLimit(
    `account-confirm-password-reset:${clientIp(request)}`,
    LIMIT.max,
    LIMIT.windowMs,
  );
  if (!rate.allowed) return rateLimitResponse(rate.resetAt);

  let body: { token?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (typeof body.token !== "string" || typeof body.newPassword !== "string") {
    return json({ error: "token and newPassword are required." }, 400);
  }

  try {
    const username = await confirmPasswordReset(body.token, body.newPassword);
    // The reset proved ownership; lift any failed-sign-in cooldown. Every
    // existing session was revoked by the reset (session version bump).
    await accountBackoff.succeed(accountKey("login-backoff", username));
    return json({ success: true });
  } catch (error) {
    if (error instanceof AccountActionError) {
      return json({ error: error.message }, error.status);
    }
    console.error("Confirm password reset failed:", error);
    return json({ error: "Failed to reset password." }, 500);
  }
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
