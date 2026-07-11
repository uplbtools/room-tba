import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import { parseRequiredEditorVersion } from "@lib/admin/expected-version";
import { normalizePlaceCategory } from "@constants/place-categories";
import { EditConflictError, updatePlace } from "@lib/services/admin-service";

export const prerender = false;

type PlacePatchBody = {
  name?: string;
  category?: string;
  lat?: number | null;
  lon?: number | null;
  description?: string | null;
  hours?: string | null;
  websiteLink?: string | null;
  facebookLink?: string | null;
  version?: number;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const PATCH: APIRoute = async ({ cookies, params, request }) => {
  const auth = await editorSessionOrUnauthorized(cookies, {
    requirePublish: true,
  });
  if (auth instanceof Response) return auth;

  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) {
    return json({ error: "Invalid place ID" }, 400);
  }

  let body: PlacePatchBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (body.name !== undefined && body.name.trim() === "") {
    return json({ error: "Place name is required" }, 400);
  }
  if (body.category !== undefined && !normalizePlaceCategory(body.category)) {
    return json({ error: "Invalid place category" }, 400);
  }
  if (
    (body.lat !== undefined &&
      body.lat !== null &&
      !Number.isFinite(Number(body.lat))) ||
    (body.lon !== undefined &&
      body.lon !== null &&
      !Number.isFinite(Number(body.lon)))
  ) {
    return json({ error: "Invalid map pin" }, 400);
  }

  const parsedVersion = parseRequiredEditorVersion(body.version);
  if (!parsedVersion.ok) return parsedVersion.response;

  try {
    const updates: Parameters<typeof updatePlace>[1] = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.category !== undefined) updates.category = body.category;
    if (body.lat !== undefined)
      updates.lat = body.lat === null ? null : Number(body.lat);
    if (body.lon !== undefined)
      updates.lon = body.lon === null ? null : Number(body.lon);
    if (body.description !== undefined)
      updates.description = body.description || null;
    if (body.hours !== undefined) updates.hours = body.hours || null;
    if (body.websiteLink !== undefined)
      updates.websiteLink = body.websiteLink || null;
    if (body.facebookLink !== undefined)
      updates.facebookLink = body.facebookLink || null;

    const place = await updatePlace(
      id,
      updates,
      parsedVersion.version,
      auth.editedBy,
    );
    return json({ success: true, place });
  } catch (error) {
    if (error instanceof EditConflictError) {
      return json(
        {
          error: "This place was changed by another editor.",
          latest: error.latest,
        },
        409,
      );
    }
    console.error("Failed to update place:", error);
    return json({ error: "Failed to save place" }, 500);
  }
};
