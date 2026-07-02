import type { APIRoute } from "astro";
import {
  canPublishDirectly,
  canReviewProposals,
  clearSessionCookie,
  createSessionToken,
  setSessionCookie,
} from "@lib/admin/auth";
import { getEditorSession } from "@lib/admin/require-editor";
import {
  checkRateLimit,
  clientIp,
  rateLimitResponse,
} from "@lib/api/rate-limit";
import {
  authenticateAdminUser,
  authenticateLegacyAdminPassword,
  getAdminUserBySupabaseId,
} from "@lib/services/admin-user-service";
import { createServerSupabaseClient } from "@lib/supabase/server";

export const prerender = false;

const LOGIN_IP_LIMIT = { max: 12, windowMs: 15 * 60 * 1000 };
const LOGIN_USER_LIMIT = { max: 8, windowMs: 15 * 60 * 1000 };

export const GET: APIRoute = async ({ cookies }) => {
  const session = getEditorSession(cookies);
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
      headers: { "Content-Type": "application/json" },
    },
  );
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const skipLoginRateLimit =
      process.env.ASTRO_E2E_SKIP_LOGIN_RATE_LIMIT === "1";
    const ip = clientIp(request);
    if (!skipLoginRateLimit) {
      const ipRate = checkRateLimit(
        `admin-login:ip:${ip}`,
        LOGIN_IP_LIMIT.max,
        LOGIN_IP_LIMIT.windowMs,
      );
      if (!ipRate.allowed) {
        return rateLimitResponse(ipRate.resetAt);
      }
    }

    const formData = await request.formData();
    const usernameRaw = formData.get("username");
    const passwordRaw = formData.get("password");
    const username = typeof usernameRaw === "string" ? usernameRaw.trim() : "";
    const password = typeof passwordRaw === "string" ? passwordRaw : "";

    if (username && !skipLoginRateLimit) {
      const userRate = checkRateLimit(
        `admin-login:user:${username.toLowerCase()}`,
        LOGIN_USER_LIMIT.max,
        LOGIN_USER_LIMIT.windowMs,
      );
      if (!userRate.allowed) {
        return rateLimitResponse(userRate.resetAt);
      }
    }

    if (!password) {
      return json({ error: "Password is required" }, 400);
    }

    let user: Awaited<ReturnType<typeof authenticateAdminUser>> = null;

    // Try Supabase Auth when configured (#293)
    try {
      const supabase = createServerSupabaseClient({
        request,
        cookies,
      });
      const { data, error } = await supabase.auth.signInWithPassword({
        email: username,
        password,
      });
      if (data.user && !error) {
        user = await getAdminUserBySupabaseId(data.user.id);
      }
    } catch {
      // Supabase not configured or unavailable → fall through to bcrypt
    }

    if (!user) {
      user = username ? await authenticateAdminUser(username, password) : null;
    }

    if (!user && !username) {
      user = await authenticateLegacyAdminPassword(password);
    }

    if (!user) {
      return json({ error: "Invalid username or password" }, 401);
    }

    let token: string;
    try {
      token = createSessionToken(user);
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

export const DELETE: APIRoute = async () => {
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
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
