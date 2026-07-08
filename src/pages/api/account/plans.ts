import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import { getPlannerData, savePlannerData } from "@lib/services/planner-service";

export const prerender = false;

// Return the signed-in user's saved planner blob (any logged-in role).
export const GET: APIRoute = async ({ cookies }) => {
  const auth = await editorSessionOrUnauthorized(cookies);
  if (auth instanceof Response) return auth;

  const data = await getPlannerData(auth.session.id);
  return json({ data });
};

// Upsert the user's planner blob. Body: { data: PlannerPersisted }.
export const PUT: APIRoute = async ({ cookies, request }) => {
  const auth = await editorSessionOrUnauthorized(cookies);
  if (auth instanceof Response) return auth;

  let body: { data?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const data = body.data;
  if (data == null || typeof data !== "object") {
    return json({ error: "data (planner blob) is required." }, 400);
  }
  if (!Array.isArray((data as { plans?: unknown }).plans)) {
    return json({ error: "data.plans must be an array." }, 400);
  }

  try {
    await savePlannerData(auth.session.id, data);
    return json({ success: true });
  } catch (error) {
    console.error("Save planner failed:", error);
    return json({ error: "Failed to save planner." }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
