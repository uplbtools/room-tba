import type { APIRoute } from "astro";
import {
  canPublishDirectly,
  canReviewProposals,
  clearSessionCookie,
  createSessionToken,
  setSessionCookie,
} from "@lib/admin/auth";
import { optionalEditorSession } from "@lib/admin/require-editor";
import { clientIp, rateLimitResponse } from "@lib/api/rate-limit";
import { accountBackoff, sharedRateLimit } from "@lib/api/rate-limit-db";
import { accountKey } from "@lib/api/rate-limit-shared";
import { readSessionVersion } from "@lib/services/account-security";
import {
  authenticateAdminUser,
  getAdminUserBySupabaseId,
} from "@lib/services/admin-user-service";
import { createServerSupabaseClient } from "@lib/supabase/server";
import { verifyTurnstileToken } from "@lib/turnstile";

export const prerender = false;

const LOGIN_RATE_LIMIT_WINDOW_MS = 30 * 1000;
const LOGIN_IP_LIMIT = { max: 12, windowMs: LOGIN_RATE_LIMIT_WINDOW_MS };
const LOGIN_USER_LIMIT = { max: 8, windowMs: LOGIN_RATE_LIMIT_WINDOW_MS };
const LOGIN_RATE_LIMIT_MESSAGE =
  "Too many sign-in attempts. Wait about 30 seconds and try again.";
const LOGIN_BACKOFF_MESSAGE =
  "Too many failed sign-ins for this account. Wait a few minutes, or reset your password.";

/** Session status for the app shell. Revalidated against the DB so a revoked
 * or deactivated session reads as signed out right away; never cached. */
export const GET: APIRoute = async ({ cookies }) => {
  const session = await optionalEditorSession(cookies);
  return new Response(
    JSON.stringify({
      admin: session !== null,
      loggedIn: session !== null,
      username: session?.username ?? null,
      displayName: session?.displayName ?? null,
      role: session?.role ?? null,
      canPublish: session ? canPublishDirectly(session.role) : false,
      canReview: session ? canReviewProposals(session.role) : false,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, no-store",
      },
    },
  );
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const skipLoginRateLimit =
      process.env.ASTRO_E2E_SKIP_LOGIN_RATE_LIMIT === "1";
    const ip = clientIp(request);
    if (!skipLoginRateLimit) {
      const ipRate = await sharedRateLimit(
        `admin-login:ip:${ip}`,
        LOGIN_IP_LIMIT.max,
        LOGIN_IP_LIMIT.windowMs,
      );
      if (!ipRate.allowed) {
        return rateLimitResponse(ipRate.resetAt, LOGIN_RATE_LIMIT_MESSAGE);
      }
    }

    const formData = await request.formData();
    const usernameRaw = formData.get("username");
    const passwordRaw = formData.get("password");
    const username = typeof usernameRaw === "string" ? usernameRaw.trim() : "";
    const password = typeof passwordRaw === "string" ? passwordRaw : "";

    // The shared ADMIN_PASSWORD login (blank username) is gone: every
    // sign-in names an account. First admin: scripts/set-admin-user.ts.
    if (!username) {
      return json({ error: "Enter your username or email." }, 400);
    }
    if (!password) {
      return json({ error: "Password is required" }, 400);
    }

    const backoffKey = accountKey("login-backoff", username);
    if (!skipLoginRateLimit) {
      const userRate = await sharedRateLimit(
        `admin-login:user:${username.toLowerCase()}`,
        LOGIN_USER_LIMIT.max,
        LOGIN_USER_LIMIT.windowMs,
      );
      if (!userRate.allowed) {
        return rateLimitResponse(userRate.resetAt, LOGIN_RATE_LIMIT_MESSAGE);
      }
      const lockedUntil = await accountBackoff.check(backoffKey);
      if (lockedUntil !== null) {
        return rateLimitResponse(lockedUntil, LOGIN_BACKOFF_MESSAGE);
      }
    }

    const turnstileToken = formData.get("turnstileToken");
    const turnstileOk = await verifyTurnstileToken(
      typeof turnstileToken === "string" ? turnstileToken : null,
      ip,
    );
    if (!turnstileOk) {
      return json(
        { error: "Verification failed. Refresh the page and try again." },
        400,
      );
    }

    let user: Awaited<ReturnType<typeof authenticateAdminUser>> = null;

    // Try Supabase Auth when configured (#293). Bounded with a timeout — a
    // slow/unreachable Supabase Auth call must not block sign-in forever;
    // fall through to bcrypt just like the "not configured" case.
    try {
      const supabase = createServerSupabaseClient({
        request,
        cookies,
      });
      const SUPABASE_LOGIN_TIMEOUT_MS = 5000;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const { data, error } = await Promise.race([
          supabase.auth.signInWithPassword({ email: username, password }),
          new Promise<never>((_, reject) => {
            timer = setTimeout(
              () => reject(new Error("Supabase sign-in timed out")),
              SUPABASE_LOGIN_TIMEOUT_MS,
            );
          }),
        ]);
        if (data.user && !error) {
          user = await getAdminUserBySupabaseId(data.user.id);
        }
      } finally {
        // Always clear the timer so a fast response doesn't leave a live
        // handle behind. The losing signInWithPassword call can't be
        // aborted (supabase-js takes no signal); it settles unobserved.
        clearTimeout(timer);
      }
    } catch {
      // Supabase not configured or unavailable → fall through to bcrypt
    }

    if (!user) {
      user = await authenticateAdminUser(username, password);
    }

    if (!user) {
      if (!skipLoginRateLimit) await accountBackoff.fail(backoffKey);
      return json({ error: "Invalid username or password" }, 401);
    }
    if (!skipLoginRateLimit) await accountBackoff.succeed(backoffKey);

    // The cookie carries the account's current session version, so the next
    // "sign out everywhere" or password change revokes it.
    const sessionVersion = await readSessionVersion(user.id);
    let token: string;
    try {
      token = createSessionToken({ ...user, sessionVersion });
    } catch (error) {
      console.error("Admin session signing misconfigured:", error);
      return json(
        {
          error:
            "Editor sign-in is not configured on this server. Contact the site maintainer.",
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
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": setSessionCookie(token),
        },
      },
    );
  } catch (error) {
    console.error("Admin login failed:", error);
    return json(
      {
        error:
          "Sign-in is temporarily unavailable. Try again in a moment, or contact the site maintainer if this keeps happening.",
      },
      503,
    );
  }
};

/** Sign out this device. "Sign out of all devices" lives at
 * /api/account/sign-out-everywhere (bumps the session version). */
export const DELETE: APIRoute = async () => {
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
      "Set-Cookie": clearSessionCookie(),
    },
  });
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
