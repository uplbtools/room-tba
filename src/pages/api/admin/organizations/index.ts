import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import { ORG_CATEGORIES, type OrgCategory } from "@constants/org-categories";
import { createOrganization } from "@lib/services/admin-service";

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
  const category =
    typeof body.category === "string" ? body.category.trim() : "";

  if (!name) return json({ error: "Organization name is required" }, 400);
  if (!ORG_CATEGORIES.includes(category as OrgCategory)) {
    return json({ error: "Invalid category" }, 400);
  }

  const lat =
    body.lat === null || body.lat === undefined ? null : Number(body.lat);
  const lon =
    body.lon === null || body.lon === undefined ? null : Number(body.lon);
  if (
    (lat !== null && !Number.isFinite(lat)) ||
    (lon !== null && !Number.isFinite(lon))
  ) {
    return json({ error: "Invalid map pin" }, 400);
  }

  try {
    const organization = await createOrganization(
      {
        name,
        category,
        lat,
        lon,
        buildingId:
          body.buildingId === null || body.buildingId === undefined
            ? null
            : Number(body.buildingId),
        roomId:
          body.roomId === null || body.roomId === undefined
            ? null
            : Number(body.roomId),
        description:
          typeof body.description === "string" ? body.description.trim() : null,
        websiteLink:
          typeof body.websiteLink === "string" ? body.websiteLink.trim() : null,
        facebookLink:
          typeof body.facebookLink === "string"
            ? body.facebookLink.trim()
            : null,
        email: typeof body.email === "string" ? body.email.trim() : null,
      },
      auth.editedBy,
    );
    if (!organization) return json({ error: "Failed to create" }, 500);
    return json({ success: true, organization }, 201);
  } catch (err) {
    console.error("Failed to create organization:", err);
    return json({ error: "Failed to create organization" }, 500);
  }
};
