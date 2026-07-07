import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import {
  AccountActionError,
  createAdminUser,
  listAllAdminUsers,
} from "@lib/services/admin-user-service";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const auth = editorSessionOrUnauthorized(cookies, { requireAdmin: true });
  if (auth instanceof Response) return auth;

  const users = await listAllAdminUsers();
  return json({ users });
};

export const POST: APIRoute = async ({ cookies, request }) => {
  const auth = editorSessionOrUnauthorized(cookies, { requireAdmin: true });
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
