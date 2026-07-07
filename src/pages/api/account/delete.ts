import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import { clearSessionCookie } from "@lib/admin/auth";
import {
  checkRateLimit,
  clientIp,
  rateLimitResponse,
} from "@lib/api/rate-limit";
import {
  AccountActionError,
  softDeleteAccount,
} from "@lib/services/admin-user-service";

export const prerender = false;

const LIMIT = { max: 5, windowMs: 60 * 1000 };

export const POST: APIRoute = async ({ cookies, request }) => {
  const auth = await editorSessionOrUnauthorized(cookies);
  if (auth instanceof Response) return auth;

  const rate = checkRateLimit(
    `account-delete:${auth.session.id}:${clientIp(request)}`,
    LIMIT.max,
    LIMIT.windowMs,
  );
  if (!rate.allowed) return rateLimitResponse(rate.resetAt);

  let body: { currentPassword?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    await softDeleteAccount(
      auth.session.id,
      typeof body.currentPassword === "string" ? body.currentPassword : null,
    );
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": clearSessionCookie(),
      },
    });
  } catch (error) {
    if (error instanceof AccountActionError) {
      return json({ error: error.message }, error.status);
    }
    console.error("Delete account failed:", error);
    return json({ error: "Failed to delete account." }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
