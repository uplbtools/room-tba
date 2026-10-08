import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import { clientIp } from "@lib/api/rate-limit";
import {
  AccountActionError,
  updateManagedUser,
} from "@lib/services/admin-user-service";
import { recordAudit } from "@lib/services/audit-log-service";

export const prerender = false;

export const PATCH: APIRoute = async ({ cookies, params, request }) => {
  const auth = await editorSessionOrUnauthorized(cookies, {
    requireAdmin: true,
  });
  if (auth instanceof Response) return auth;

  const id = parseInt(params.id ?? "", 10);
  if (Number.isNaN(id)) return json({ error: "Invalid user ID" }, 400);

  let body: {
    role?: "admin" | "editor" | "contributor";
    isActive?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (
    body.role !== undefined &&
    !["admin", "editor", "contributor"].includes(body.role)
  ) {
    return json({ error: "Invalid role." }, 400);
  }

  try {
    const user = await updateManagedUser(id, {
      role: body.role,
      isActive: body.isActive,
    });
    const ip = clientIp(request);
    const base = {
      actor: auth.session,
      targetUserId: user.id,
      targetLabel: user.username,
      ip,
    };
    if (body.role !== undefined && body.role !== user.previous.role) {
      await recordAudit({
        ...base,
        action: "user.role_changed",
        detail: { from: user.previous.role, to: user.role },
      });
    }
    if (
      body.isActive !== undefined &&
      body.isActive !== user.previous.isActive
    ) {
      await recordAudit({
        ...base,
        action: body.isActive ? "user.activated" : "user.deactivated",
      });
    }
    return json({ success: true, user });
  } catch (error) {
    if (error instanceof AccountActionError) {
      return json({ error: error.message }, error.status);
    }
    console.error("Update managed user failed:", error);
    return json({ error: "Failed to update account." }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
