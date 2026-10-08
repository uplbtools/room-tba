import type { APIRoute } from "astro";
import {
  checkRateLimit,
  clientIp,
  rateLimitResponse,
} from "@lib/api/rate-limit";
import { checkNewPassword } from "@lib/auth/breached-password";
import {
  loginStepResponse,
  readLoginChallenge,
  sessionLoginResponse,
} from "@lib/auth/login-challenge";
import { type LoginStep, remainingSteps } from "@lib/auth/login-steps";
import {
  AccountActionError,
  changePassword,
} from "@lib/services/admin-user-service";
import { recordAudit } from "@lib/services/audit-log-service";
import {
  confirmMfaEnrollment,
  getActiveSessionUser,
  loginPlanFor,
  setMustChangePassword,
  startMfaEnrollment,
  verifyMfaCode,
} from "@lib/services/staff-security-service";

export const prerender = false;

const STEP_LIMIT = { max: 10, windowMs: 5 * 60 * 1000 };

type StepBody = {
  challenge?: unknown;
  action?: unknown;
  code?: unknown;
  currentPassword?: unknown;
  newPassword?: unknown;
};

const str = (value: unknown) => (typeof value === "string" ? value : "");

/**
 * Second half of a password sign-in (auth audit item 19): the 2FA code,
 * required 2FA enrollment, or a forced password change. Each call answers
 * the next open step and gets either the following step or the session.
 * Public route (no session yet); the signed challenge names the account.
 */
export const POST: APIRoute = async ({ request }) => {
  let body: StepBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const challenge = readLoginChallenge(str(body.challenge));
  if (!challenge) {
    return json({ error: "This sign-in expired. Sign in again." }, 401);
  }

  const ip = clientIp(request);
  const rate = checkRateLimit(
    `login-step:${challenge.userId}`,
    STEP_LIMIT.max,
    STEP_LIMIT.windowMs,
  );
  if (!rate.allowed) {
    return rateLimitResponse(
      rate.resetAt,
      "Too many attempts. Wait a few minutes and sign in again.",
    );
  }

  const user = await getActiveSessionUser(challenge.userId);
  if (!user)
    return json({ error: "This sign-in expired. Sign in again." }, 401);

  const plan = await loginPlanFor(user);
  const done: LoginStep[] = [...challenge.done];
  let open = remainingSteps(plan.steps, done);
  const step = open[0];
  const extra: { recoveryCodes?: string[] } = {};

  try {
    switch (str(body.action)) {
      case "verify_mfa": {
        if (step !== "mfa") break;
        const result = await verifyMfaCode(user.id, str(body.code));
        if (!result) {
          await recordAudit({
            action: "login.mfa_failure",
            actor: user,
            targetUserId: user.id,
            targetLabel: user.username,
            ip,
          });
          return json(
            { error: "That code did not work. Try the newest one." },
            400,
          );
        }
        if (result === "recovery") {
          await recordAudit({
            action: "mfa.recovery_code_used",
            actor: user,
            targetUserId: user.id,
            targetLabel: user.username,
            ip,
          });
        }
        done.push("mfa");
        break;
      }
      case "enroll_start": {
        if (step !== "enroll_mfa") break;
        const enrollment = await startMfaEnrollment(user);
        return loginStepResponse(user.id, open, done, enrollment);
      }
      case "enroll_confirm": {
        if (step !== "enroll_mfa") break;
        extra.recoveryCodes = await confirmMfaEnrollment(
          user.id,
          str(body.code),
        );
        await recordAudit({
          action: "mfa.enabled",
          actor: user,
          targetUserId: user.id,
          targetLabel: user.username,
          ip,
        });
        done.push("enroll_mfa");
        break;
      }
      case "change_password": {
        if (step !== "change_password") break;
        const newPassword = str(body.newPassword);
        const weak = await checkNewPassword(newPassword);
        if (weak) return json({ error: weak }, 400);
        if (newPassword === str(body.currentPassword)) {
          return json(
            { error: "Choose a password different from the temporary one." },
            400,
          );
        }
        await changePassword(user.id, str(body.currentPassword), newPassword);
        await setMustChangePassword(user.id, false);
        await recordAudit({
          action: "password.changed",
          actor: user,
          targetUserId: user.id,
          targetLabel: user.username,
          detail: { forced: true },
          ip,
        });
        done.push("change_password");
        break;
      }
      default:
        return json({ error: "Unknown step." }, 400);
    }
  } catch (error) {
    if (error instanceof AccountActionError) {
      return json({ error: error.message }, error.status);
    }
    console.error("Login step failed:", error);
    return json({ error: "Sign-in failed on our side. Try again." }, 500);
  }

  open = remainingSteps(plan.steps, done);
  if (open.length > 0) return loginStepResponse(user.id, open, done, extra);

  await recordAudit({
    action: "login.success",
    actor: user,
    targetUserId: user.id,
    targetLabel: user.username,
    detail: { method: "password", steps: done },
    ip,
  });
  return sessionLoginResponse(user, extra);
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
