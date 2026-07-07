import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import {
  AccountActionError,
  getAccountProfile,
  updateDisplayName,
} from "@lib/services/admin-user-service";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const auth = editorSessionOrUnauthorized(cookies);
  if (auth instanceof Response) return auth;

  const profile = await getAccountProfile(auth.session.id);
  if (!profile) return json({ error: "Account not found." }, 404);
  return json(profile);
};

export const PATCH: APIRoute = async ({ cookies, request }) => {
  const auth = editorSessionOrUnauthorized(cookies);
  if (auth instanceof Response) return auth;

  let body: { displayName?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (typeof body.displayName !== "string") {
    return json({ error: "displayName is required." }, 400);
  }

  try {
    await updateDisplayName(auth.session.id, body.displayName);
    const profile = await getAccountProfile(auth.session.id);
    return json({ success: true, profile });
  } catch (error) {
    if (error instanceof AccountActionError) {
      return json({ error: error.message }, error.status);
    }
    console.error("Update display name failed:", error);
    return json({ error: "Failed to update display name." }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
