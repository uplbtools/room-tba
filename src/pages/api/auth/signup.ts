import type { APIRoute } from "astro";
import {
  canPublishDirectly,
  canReviewProposals,
  createSessionToken,
  setSessionCookie,
} from "@lib/admin/auth";
import {
  BREACHED_PASSWORD_MESSAGE,
  pwnedPasswordCount,
} from "@lib/auth/breached-password";
import {
  type SignupInput,
  validateContributorSignup,
} from "@lib/auth/contributor-signup";
import { clientIp, rateLimitResponse } from "@lib/api/rate-limit";
import { sharedRateLimit } from "@lib/api/rate-limit-db";
import {
  AccountActionError,
  createContributorAccount,
} from "@lib/services/admin-user-service";
import { recordAudit } from "@lib/services/audit-log-service";
import { verifyTurnstileToken } from "@lib/turnstile";

export const prerender = false;

const SIGNUP_IP_LIMIT = { max: 5, windowMs: 60 * 1000 };
const SIGNUP_RATE_LIMIT_MESSAGE =
  "Too many sign-up attempts. Wait about a minute and try again.";

/**
 * Contributor self-signup (#456 follow-up). Creates a *contributor-role*
 * account only — never admin/editor — so proposals get attributed to an
 * account and the username is reserved from anonymous submitters.
 * Guarded by a shared IP rate limit + Turnstile like the login path.
 *
 * A typed email starts unverified: the account gets a confirmation link and
 * the address only counts (Google linking, reset and review mail) once
 * clicked. Responses never say whether the username or email was taken.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const ip = clientIp(request);
    const skipRateLimit = process.env.ASTRO_E2E_SKIP_LOGIN_RATE_LIMIT === "1";
    if (!skipRateLimit) {
      const rate = await sharedRateLimit(
        `contributor-signup:ip:${ip}`,
        SIGNUP_IP_LIMIT.max,
        SIGNUP_IP_LIMIT.windowMs,
      );
      if (!rate.allowed) {
        return rateLimitResponse(rate.resetAt, SIGNUP_RATE_LIMIT_MESSAGE);
      }
    }

    let body: SignupInput & { turnstileToken?: unknown };
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const turnstileOk = await verifyTurnstileToken(
      typeof body.turnstileToken === "string" ? body.turnstileToken : null,
      ip,
    );
    if (!turnstileOk) {
      return json(
        { error: "Verification failed. Refresh the page and try again." },
        400,
      );
    }

    const valid = validateContributorSignup(body);
    if (!valid.ok) return json({ error: valid.error }, valid.status);

    // Breached-password check (HIBP k-anonymity); fails open.
    const breaches = await pwnedPasswordCount(valid.password);
    if (breaches && breaches > 0) {
      return json({ error: BREACHED_PASSWORD_MESSAGE }, 400);
    }

    // The role is hard-coded in createContributorAccount so this public
    // endpoint can never mint an admin/editor.
    let user: Awaited<ReturnType<typeof createContributorAccount>>;
    try {
      user = await createContributorAccount({
        username: valid.username,
        displayName: valid.displayName,
        email: valid.email,
        password: valid.password,
      });
    } catch (error) {
      if (error instanceof AccountActionError) {
        return json({ error: error.message }, error.status);
      }
      throw error;
    }

    await recordAudit({
      action: "user.created",
      actorLabel: user.username,
      targetUserId: user.id,
      targetLabel: user.username,
      detail: { role: user.role, via: "signup" },
      ip,
    });

    let token: string;
    try {
      token = createSessionToken({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        sessionVersion: 0,
      });
    } catch (error) {
      console.error("Signup session signing misconfigured:", error);
      return json(
        {
          error:
            "Sign-up is not configured on this server. Contact the site maintainer.",
        },
        503,
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        canPublish: canPublishDirectly(user.role),
        canReview: canReviewProposals(user.role),
        // Same value whether or not the address was already registered.
        verifyEmail: valid.email !== null,
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": setSessionCookie(token),
        },
      },
    );
  } catch (error) {
    console.error("Contributor signup failed:", error);
    return json(
      { error: "Sign-up is temporarily unavailable. Try again in a moment." },
      503,
    );
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
