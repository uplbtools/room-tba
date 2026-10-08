import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import {
  checkRateLimit,
  clientIp,
  rateLimitResponse,
} from "@lib/api/rate-limit";
import { AccountActionError } from "@lib/services/admin-user-service";
import { recordAudit } from "@lib/services/audit-log-service";
import {
  confirmMfaEnrollment,
  disableMfa,
  getMfaStatus,
  regenerateRecoveryCodes,
  startMfaEnrollment,
  verifyMfaCode,
} from "@lib/services/staff-security-service";

export const prerender = false;

const LIMIT = { max: 10, windowMs: 5 * 60 * 1000 };

/** Two-step verification status for Account settings. */
export const GET: APIRoute = async ({ cookies }) => {
  const auth = await editorSessionOrUnauthorized(cookies);
  if (auth instanceof Response) return auth;
  try {
    return json(await getMfaStatus(auth.session));
  } catch (error) {
    console.error("MFA status failed:", error);
    return json({ error: "Could not load two-step verification." }, 500);
  }
};

/**
 * `start` returns a new secret, `confirm` turns it on with a code and
 * returns recovery codes, `disable` and `recovery_codes` need a current
 * code (or recovery code) so a stolen session alone cannot remove 2FA.
 */
export const POST: APIRoute = async ({ cookies, request }) => {
  const auth = await editorSessionOrUnauthorized(cookies);
  if (auth instanceof Response) return auth;

  const ip = clientIp(request);
  const rate = checkRateLimit(
    `account-mfa:${auth.session.id}`,
    LIMIT.max,
    LIMIT.windowMs,
  );
  if (!rate.allowed) return rateLimitResponse(rate.resetAt);

  let body: { action?: unknown; code?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const code = typeof body.code === "string" ? body.code : "";
  const audit = (action: "mfa.enabled" | "mfa.disabled") =>
    recordAudit({
      action,
      actor: auth.session,
      targetUserId: auth.session.id,
      targetLabel: auth.session.username,
      ip,
    });

  try {
    switch (body.action) {
      case "start":
        return json(await startMfaEnrollment(auth.session));
      case "confirm": {
        const recoveryCodes = await confirmMfaEnrollment(auth.session.id, code);
        await audit("mfa.enabled");
        return json({ recoveryCodes });
      }
      case "disable": {
        if (!(await verifyMfaCode(auth.session.id, code))) {
          return json({ error: "That code did not work." }, 400);
        }
        await disableMfa(auth.session);
        await audit("mfa.disabled");
        return json({ success: true });
      }
      case "recovery_codes": {
        if (!(await verifyMfaCode(auth.session.id, code))) {
          return json({ error: "That code did not work." }, 400);
        }
        return json({
          recoveryCodes: await regenerateRecoveryCodes(auth.session.id),
        });
      }
      default:
        return json({ error: "Unknown action." }, 400);
    }
  } catch (error) {
    if (error instanceof AccountActionError) {
      return json({ error: error.message }, error.status);
    }
    console.error("MFA action failed:", error);
    return json({ error: "Two-step verification failed. Try again." }, 500);
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
