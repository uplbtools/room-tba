import type { APIRoute } from "astro";
import {
  checkRateLimit,
  clientIp,
  rateLimitResponse,
} from "@lib/api/rate-limit";
import { checkNewPassword } from "@lib/auth/breached-password";
import { usernameError } from "@lib/auth/contributor-signup";
import { sessionLoginResponse } from "@lib/auth/login-challenge";
import { AccountActionError } from "@lib/services/admin-user-service";
import { recordAudit } from "@lib/services/audit-log-service";
import { acceptStaffInvite } from "@lib/services/staff-invite-service";

export const prerender = false;

const LIMIT = { max: 8, windowMs: 60 * 1000 };

/**
 * Finish a staff invite (auth audit item 19): the invitee picks a username
 * and password, gets the invited role and email, and is signed in.
 */
export const POST: APIRoute = async ({ request }) => {
  const ip = clientIp(request);
  const rate = checkRateLimit(`accept-invite:${ip}`, LIMIT.max, LIMIT.windowMs);
  if (!rate.allowed) return rateLimitResponse(rate.resetAt);

  let body: {
    token?: unknown;
    username?: unknown;
    password?: unknown;
    displayName?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const token = typeof body.token === "string" ? body.token : "";
  const username =
    typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!token) return json({ error: "This invite link is incomplete." }, 400);

  const badUsername = usernameError(username);
  if (badUsername) return json({ error: badUsername }, 400);
  const weak = await checkNewPassword(password);
  if (weak) return json({ error: weak }, 400);

  try {
    const user = await acceptStaffInvite({
      token,
      username,
      password,
      displayName:
        typeof body.displayName === "string" ? body.displayName : null,
    });
    await recordAudit({
      action: "user.invite_accepted",
      actorLabel: user.username,
      targetUserId: user.id,
      targetLabel: user.username,
      detail: { role: user.role },
      ip,
    });
    return sessionLoginResponse(user);
  } catch (error) {
    if (error instanceof AccountActionError) {
      return json({ error: error.message }, error.status);
    }
    console.error("Accept invite failed:", error);
    return json({ error: "Could not finish the invite. Try again." }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
