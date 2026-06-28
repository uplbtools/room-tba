import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import { createCollege } from "@lib/services/admin-service";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ cookies, request }) => {
  const auth = editorSessionOrUnauthorized(cookies, { requirePublish: true });
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const collegeName =
    typeof body.collegeName === "string" ? body.collegeName.trim() : "";
  if (!collegeName) {
    return json({ error: "College name is required" }, 400);
  }

  try {
    const college = await createCollege(collegeName, auth.editedBy);
    if (!college) {
      return json({ error: "Failed to create college" }, 500);
    }
    return json({ success: true, college }, 201);
  } catch (err) {
    console.error("Failed to create college:", err);
    return json({ error: "Failed to create college" }, 500);
  }
};
