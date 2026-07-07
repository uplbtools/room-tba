import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import {
  AccountActionError,
  unlinkGoogleIdentity,
} from "@lib/services/admin-user-service";

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  const auth = await editorSessionOrUnauthorized(cookies);
  if (auth instanceof Response) return auth;

  try {
    await unlinkGoogleIdentity(auth.session.id);
    return json({ success: true });
  } catch (error) {
    if (error instanceof AccountActionError) {
      return json({ error: error.message }, error.status);
    }
    console.error("Unlink Google failed:", error);
    return json({ error: "Failed to disconnect Google." }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
