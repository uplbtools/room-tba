import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import { createDorm } from "@lib/services/admin-service";

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

  const dormName =
    typeof body.dormName === "string" ? body.dormName.trim() : "";
  const gender = typeof body.gender === "string" ? body.gender.trim() : "";

  if (!dormName) {
    return json({ error: "Dorm name is required" }, 400);
  }
  if (!gender) {
    return json({ error: "Dorm gender policy is required" }, 400);
  }

  const lat =
    body.lat === null || body.lat === undefined ? null : Number(body.lat);
  const lon =
    body.lon === null || body.lon === undefined ? null : Number(body.lon);

  if (
    (lat !== null && !Number.isFinite(lat)) ||
    (lon !== null && !Number.isFinite(lon))
  ) {
    return json({ error: "Invalid dorm map pin" }, 400);
  }

  try {
    const dorm = await createDorm(
      {
        dormName,
        gender,
        lat,
        lon,
        shortName:
          typeof body.shortName === "string" ? body.shortName.trim() : null,
        description:
          typeof body.description === "string" ? body.description.trim() : null,
      },
      auth.editedBy,
    );
    if (!dorm) {
      return json({ error: "Failed to create dorm" }, 500);
    }
    return json({ success: true, dorm }, 201);
  } catch (err) {
    console.error("Failed to create dorm:", err);
    return json({ error: "Failed to create dorm" }, 500);
  }
};
