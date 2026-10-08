import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import { clientIp } from "@lib/api/rate-limit";
import {
  AccountActionError,
  createAdminUser,
  listAllAdminUsers,
} from "@lib/services/admin-user-service";
import { recordAudit } from "@lib/services/audit-log-service";
import { listPendingInvites } from "@lib/services/staff-invite-service";
import { setMustChangePassword } from "@lib/services/staff-security-service";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const auth = await editorSessionOrUnauthorized(cookies, {
    requireAdmin: true,
  });
  if (auth instanceof Response) return auth;

  const [users, invites] = await Promise.all([
    listAllAdminUsers(),
    listPendingInvites().catch((error) => {
      console.error("List pending invites failed:", error);
      return [];
    }),
  ]);
  return json({ users, invites });
};

export const POST: APIRoute = async ({ cookies, request }) => {
  const auth = await editorSessionOrUnauthorized(cookies, {
    requireAdmin: true,
  });
  if (auth instanceof Response) return auth;

  let body: {
    username?: string;
    displayName?: string;
    email?: string;
    password?: string;
    role?: "admin" | "editor" | "contributor";
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (typeof body.username !== "string" || typeof body.password !== "string") {
    return json({ error: "username and password are required." }, 400);
  }
  const role = body.role ?? "editor";
  if (!["admin", "editor", "contributor"].includes(role)) {
    return json({ error: "Invalid role." }, 400);
  }

  try {
    const user = await createAdminUser({
      username: body.username,
      displayName: body.displayName,
      email: body.email,
      password: body.password,
      role,
    });
    // An admin chose this password, so the owner must replace it at their
    // first sign-in (auth audit item 19). Invites avoid this entirely.
    await setMustChangePassword(user.id, true).catch((error) =>
      console.error("Setting must_change_password failed:", error),
    );
    await recordAudit({
      action: "user.created",
      actor: auth.session,
      targetUserId: user.id,
      targetLabel: user.username,
      detail: { role, via: "temporary-password" },
      ip: clientIp(request),
    });
    return json({ success: true, user }, 201);
  } catch (error) {
    if (error instanceof AccountActionError) {
      return json({ error: error.message }, error.status);
    }
    console.error("Create admin user failed:", error);
    return json({ error: "Failed to create account." }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
