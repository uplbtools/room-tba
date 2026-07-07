import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import { getEntityHistory } from "@lib/services/history-service";

export const prerender = false;

export const GET: APIRoute = async ({ cookies, url }) => {
  const auth = editorSessionOrUnauthorized(cookies, { requirePublish: true });
  if (auth instanceof Response) return auth;

  const entityType = url.searchParams.get("entityType") ?? "";
  const entityId = Number(url.searchParams.get("entityId"));
  if (!entityType || !Number.isInteger(entityId) || entityId < 1) {
    return json({ error: "entityType and entityId are required." }, 400);
  }
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);

  const entries = await getEntityHistory(entityType, entityId, { offset });
  return json({ entries });
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
