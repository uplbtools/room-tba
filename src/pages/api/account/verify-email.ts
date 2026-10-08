import type { APIRoute } from "astro";
import { clientIp, rateLimitResponse } from "@lib/api/rate-limit";
import { sharedRateLimit } from "@lib/api/rate-limit-db";
import {
  AccountActionError,
  verifyEmailToken,
} from "@lib/services/admin-user-service";

export const prerender = false;

const LIMIT = { max: 10, windowMs: 60 * 1000 };

/**
 * Confirm an email address from the link in the verification mail. The link
 * opens /verify-email, which POSTs the token here when the person presses the
 * button; a GET would let mail scanners that prefetch links burn the
 * single-use token. No session needed: the signed token names the account.
 */
export const POST: APIRoute = async ({ request }) => {
  const rate = await sharedRateLimit(
    `account-verify-email:${clientIp(request)}`,
    LIMIT.max,
    LIMIT.windowMs,
  );
  if (!rate.allowed) return rateLimitResponse(rate.resetAt);

  let body: { token?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (typeof body.token !== "string" || !body.token) {
    return json({ error: "This link is invalid or has expired." }, 400);
  }

  try {
    await verifyEmailToken(body.token);
    return json({ success: true });
  } catch (error) {
    if (error instanceof AccountActionError) {
      return json({ error: error.message }, error.status);
    }
    console.error("Verify email failed:", error);
    return json({ error: "Could not confirm your email. Try again." }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
    },
  });
}
