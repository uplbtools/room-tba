import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import { createJeepneyStop } from "@lib/services/transit-service";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ cookies, request }) => {
  const auth = await editorSessionOrUnauthorized(cookies, {
    requirePublish: true,
  });
  if (auth instanceof Response) return auth;

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const routeId = typeof body?.routeId === "string" ? body.routeId.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const description =
    typeof body?.description === "string" ? body.description.trim() : "";
  const lat = Number(body?.lat);
  const lon = Number(body?.lon);
  if (!routeId || !name || !description) {
    return json(
      { error: "Route, stop name, and description are required." },
      400,
    );
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return json({ error: "Enter a valid stop location." }, 400);
  }

  try {
    const stop = await createJeepneyStop(
      { routeId, name, description, lat, lon },
      auth.editedBy,
    );
    return stop
      ? json({ success: true, stop }, 201)
      : json({ error: "Jeepney route not found." }, 404);
  } catch (error) {
    console.error("Failed to create jeepney stop:", error);
    return json({ error: "Failed to add stop." }, 500);
  }
};
