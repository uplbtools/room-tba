import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import { normalizePlaceCategory } from "@constants/place-categories";
import { createPlace } from "@lib/services/admin-service";

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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const category = normalizePlaceCategory(body.category);
  const lat =
    body.lat === null || body.lat === undefined ? null : Number(body.lat);
  const lon =
    body.lon === null || body.lon === undefined ? null : Number(body.lon);

  if (!name) return json({ error: "Place name is required" }, 400);
  if (!category) return json({ error: "Invalid place category" }, 400);
  if (
    (lat !== null && !Number.isFinite(lat)) ||
    (lon !== null && !Number.isFinite(lon))
  ) {
    return json({ error: "Invalid map pin" }, 400);
  }

  try {
    const place = await createPlace(
      {
        name,
        category,
        lat,
        lon,
        description:
          typeof body.description === "string" ? body.description.trim() : null,
        hours: typeof body.hours === "string" ? body.hours.trim() : null,
        websiteLink:
          typeof body.websiteLink === "string" ? body.websiteLink.trim() : null,
        facebookLink:
          typeof body.facebookLink === "string"
            ? body.facebookLink.trim()
            : null,
      },
      auth.editedBy,
    );
    if (!place) return json({ error: "Failed to create place" }, 500);
    return json({ success: true, place }, 201);
  } catch (error) {
    console.error("Failed to create place:", error);
    return json({ error: "Failed to create place" }, 500);
  }
};
