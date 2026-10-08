import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import {
  checkRateLimit,
  clientIp,
  rateLimitResponse,
} from "@lib/api/rate-limit";
import {
  createAccessRequest,
  getMyAccessRequest,
} from "@lib/services/access-request-service";
import { AccountActionError } from "@lib/services/admin-user-service";
import { recordAudit } from "@lib/services/audit-log-service";

export const prerender = false;

const LIMIT = { max: 3, windowMs: 10 * 60 * 1000 };

/** The signed-in contributor's latest editor access request, if any. */
export const GET: APIRoute = async ({ cookies }) => {
  const auth = await editorSessionOrUnauthorized(cookies);
  if (auth instanceof Response) return auth;
  try {
    return json({ request: await getMyAccessRequest(auth.session.id) });
  } catch (error) {
    console.error("Load access request failed:", error);
    return json({ request: null });
  }
};

/** Ask the admins for editor access (auth audit item 15). */
export const POST: APIRoute = async ({ cookies, request }) => {
  const auth = await editorSessionOrUnauthorized(cookies);
  if (auth instanceof Response) return auth;

  const ip = clientIp(request);
  const rate = checkRateLimit(
    `access-request:${auth.session.id}`,
    LIMIT.max,
    LIMIT.windowMs,
  );
  if (!rate.allowed) return rateLimitResponse(rate.resetAt);

  let body: { message?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  try {
    const created = await createAccessRequest(
      auth.session,
      typeof body.message === "string" ? body.message : "",
    );
    await recordAudit({
      action: "access.requested",
      actor: auth.session,
      targetUserId: auth.session.id,
      targetLabel: auth.session.username,
      ip,
    });
    return json({ success: true, request: created }, 201);
  } catch (error) {
    if (error instanceof AccountActionError) {
      return json({ error: error.message }, error.status);
    }
    console.error("Create access request failed:", error);
    return json({ error: "Could not send the request. Try again." }, 500);
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
