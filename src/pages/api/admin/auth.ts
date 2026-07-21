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
} from "@lib/services/admin-user-service";

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

export const POST: APIRoute = async ({ request }) => {
  const ip = clientIp(request);
  const ipRate = checkRateLimit(
    `admin-login:ip:${ip}`,
    LOGIN_IP_LIMIT.max,
    LOGIN_IP_LIMIT.windowMs,
  );
  if (!ipRate.allowed) {
    return rateLimitResponse(ipRate.resetAt);
  }

  const formData = await request.formData();
  const usernameRaw = formData.get("username");
  const passwordRaw = formData.get("password");
  const username = typeof usernameRaw === "string" ? usernameRaw.trim() : "";
  const password = typeof passwordRaw === "string" ? passwordRaw : "";

  if (username) {
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

  let user = username ? await authenticateAdminUser(username, password) : null;

  if (!user && !username) {
    user = await authenticateLegacyAdminPassword(password);
  }

  if (!user) {
    return json({ error: "Invalid username or password" }, 401);
  }

  const token = createSessionToken(user);
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
