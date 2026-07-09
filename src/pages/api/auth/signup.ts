import type { APIRoute } from "astro";
import {
  canPublishDirectly,
  canReviewProposals,
  createSessionToken,
  setSessionCookie,
} from "@lib/admin/auth";
import {
  type SignupInput,
  validateContributorSignup,
} from "@lib/auth/contributor-signup";
import {
  checkRateLimit,
  clientIp,
  rateLimitResponse,
} from "@lib/api/rate-limit";
import {
  AccountActionError,
  createAdminUser,
} from "@lib/services/admin-user-service";
import { verifyTurnstileToken } from "@lib/turnstile";

export const prerender = false;

const SIGNUP_IP_LIMIT = { max: 5, windowMs: 60 * 1000 };
const SIGNUP_RATE_LIMIT_MESSAGE =
  "Too many sign-up attempts. Wait about a minute and try again.";

/**
 * Contributor self-signup (#456 follow-up). Creates a *contributor-role*
 * account only — never admin/editor — so proposals get attributed to a
 * verified account and the username is reserved from anonymous submitters.
 * Guarded by IP rate limit + Turnstile like the login path.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const ip = clientIp(request);
    const skipRateLimit = process.env.ASTRO_E2E_SKIP_LOGIN_RATE_LIMIT === "1";
    if (!skipRateLimit) {
      const rate = checkRateLimit(
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

    // Reuses the admin-user insert (bcrypt + atomic username-unique guard),
    // but the role is hard-coded here so this public endpoint can never mint
    // an admin/editor. A taken username surfaces as AccountActionError(409).
    let user: Awaited<ReturnType<typeof createAdminUser>>;
    try {
      user = await createAdminUser({
        username: valid.username,
        displayName: valid.displayName ?? undefined,
        email: valid.email ?? undefined,
        password: valid.password,
        role: "contributor",
      });
    } catch (error) {
      if (error instanceof AccountActionError) {
        return json({ error: error.message }, error.status);
      }
      throw error;
    }

    let token: string;
    try {
      token = createSessionToken({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
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
