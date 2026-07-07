import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import {
  checkRateLimit,
  clientIp,
  rateLimitResponse,
} from "@lib/api/rate-limit";
import {
  AccountActionError,
  requestEmailChange,
} from "@lib/services/admin-user-service";

export const prerender = false;

const LIMIT = { max: 5, windowMs: 60 * 1000 };

export const POST: APIRoute = async ({ cookies, request }) => {
  const auth = editorSessionOrUnauthorized(cookies);
  if (auth instanceof Response) return auth;

  const rate = checkRateLimit(
    `account-request-email-change:${auth.session.id}:${clientIp(request)}`,
    LIMIT.max,
    LIMIT.windowMs,
  );
  if (!rate.allowed) return rateLimitResponse(rate.resetAt);

  let body: { newEmail?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (typeof body.newEmail !== "string") {
    return json({ error: "newEmail is required." }, 400);
  }

  try {
    await requestEmailChange(auth.session.id, body.newEmail);
    return json({ success: true });
  } catch (error) {
    if (error instanceof AccountActionError) {
      return json({ error: error.message }, error.status);
    }
    console.error("Request email change failed:", error);
    return json({ error: "Failed to send confirmation email." }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
