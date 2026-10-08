import { timingSafeEqual } from "node:crypto";
import { CRON_SECRET } from "astro:env/server";

/**
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Returns an error
 * response when the request is not that, or null when it may proceed.
 */
export function cronAuthError(request: Request): Response | null {
  if (!CRON_SECRET) {
    return cronJson({ error: "Cron is not configured on this server." }, 503);
  }
  const authBuf = Buffer.from(request.headers.get("authorization") ?? "");
  const expectedBuf = Buffer.from(`Bearer ${CRON_SECRET}`);
  if (
    authBuf.length !== expectedBuf.length ||
    !timingSafeEqual(authBuf, expectedBuf)
  ) {
    return cronJson({ error: "Unauthorized" }, 401);
  }
  return null;
}

export function cronJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
