import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import {
  checkRateLimit,
  clientIp,
  rateLimitResponse,
} from "@lib/api/rate-limit";
import {
  AccountActionError,
  changePassword,
} from "@lib/services/admin-user-service";

export const prerender = false;

const LIMIT = { max: 8, windowMs: 30 * 1000 };

export const POST: APIRoute = async ({ cookies, request }) => {
  const auth = await editorSessionOrUnauthorized(cookies);
  if (auth instanceof Response) return auth;

  const rate = checkRateLimit(
    `account-change-password:${auth.session.id}:${clientIp(request)}`,
    LIMIT.max,
    LIMIT.windowMs,
  );
  if (!rate.allowed) return rateLimitResponse(rate.resetAt);

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (typeof body.newPassword !== "string") {
    return json({ error: "newPassword is required." }, 400);
  }

  try {
    await changePassword(
      auth.session.id,
      typeof body.currentPassword === "string" ? body.currentPassword : null,
      body.newPassword,
    );
    return json({ success: true });
  } catch (error) {
    if (error instanceof AccountActionError) {
      return json({ error: error.message }, error.status);
    }
    console.error("Change password failed:", error);
    return json({ error: "Failed to change password." }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
