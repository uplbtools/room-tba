import type { APIRoute } from "astro";
import {
  checkRateLimit,
  clientIp,
  rateLimitResponse,
} from "@lib/api/rate-limit";
import { verifySignedToken } from "@lib/admin/signed-token";
import { checkNewPassword } from "@lib/auth/breached-password";
import {
  AccountActionError,
  confirmPasswordReset,
} from "@lib/services/admin-user-service";
import { recordAudit } from "@lib/services/audit-log-service";
import { setMustChangePassword } from "@lib/services/staff-security-service";

export const prerender = false;

const LIMIT = { max: 8, windowMs: 60 * 1000 };

export const POST: APIRoute = async ({ request }) => {
  const rate = checkRateLimit(
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

  const weak = await checkNewPassword(body.newPassword);
  if (weak) return json({ error: weak }, 400);

  try {
    await confirmPasswordReset(body.token, body.newPassword);
    // The service checked the token; read its user id for the audit row.
    const userId =
      verifySignedToken<{ userId?: number }>(body.token)?.userId ?? null;
    if (userId) {
      await setMustChangePassword(userId, false).catch((error) =>
        console.error("Clearing must_change_password failed:", error),
      );
    }
    await recordAudit({
      action: "password.reset_completed",
      targetUserId: userId,
      ip: clientIp(request),
    });
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
    headers: { "Content-Type": "application/json" },
  });
}
