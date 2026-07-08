import type { APIRoute } from "astro";
import { R2_PUBLIC_URL } from "astro:env/server";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import { parseRequiredEditorVersion } from "@lib/admin/expected-version";
import { parseImageUrl } from "@lib/r2-upload-core";
import { ORG_CATEGORIES, type OrgCategory } from "@constants/org-categories";
import {
  EditConflictError,
  updateOrganization,
} from "@lib/services/admin-service";

export const prerender = false;

type OrgPatchBody = {
  imageUrl?: string | null;
  name?: string;
  category?: string;
  buildingId?: number | null;
  roomId?: number | null;
  lat?: number | null;
  lon?: number | null;
  description?: string | null;
  websiteLink?: string | null;
  facebookLink?: string | null;
  email?: string | null;
  version?: number;
};

export const PATCH: APIRoute = async ({ cookies, params, request }) => {
  const auth = await editorSessionOrUnauthorized(cookies, {
    requirePublish: true,
  });
  if (auth instanceof Response) return auth;

  const id = parseInt(params.id ?? "", 10);
  if (Number.isNaN(id)) {
    return new Response(JSON.stringify({ error: "Invalid organization ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: OrgPatchBody;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (body.name !== undefined && body.name.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: "Organization name is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
  if (
    body.category !== undefined &&
    !ORG_CATEGORIES.includes(body.category as OrgCategory)
  ) {
    return new Response(JSON.stringify({ error: "Invalid category" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsedImageUrl = parseImageUrl(
    body.imageUrl,
    R2_PUBLIC_URL,
    "Organization image",
  );
  if (!parsedImageUrl.ok) {
    return new Response(JSON.stringify({ error: parsedImageUrl.error }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsedVersion = parseRequiredEditorVersion(body.version);
  if (!parsedVersion.ok) return parsedVersion.response;

  try {
    const updates: Parameters<typeof updateOrganization>[1] = {};
    if (parsedImageUrl.provided) updates.imageUrl = parsedImageUrl.imageUrl;
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.category !== undefined) updates.category = body.category;
    if (body.buildingId !== undefined) {
      updates.buildingId =
        body.buildingId === null ? null : Number(body.buildingId);
    }
    if (body.roomId !== undefined) {
      updates.roomId = body.roomId === null ? null : Number(body.roomId);
    }
    if (body.lat !== undefined)
      updates.lat = body.lat === null ? null : Number(body.lat);
    if (body.lon !== undefined)
      updates.lon = body.lon === null ? null : Number(body.lon);
    if (body.description !== undefined)
      updates.description = body.description || null;
    if (body.websiteLink !== undefined)
      updates.websiteLink = body.websiteLink || null;
    if (body.facebookLink !== undefined)
      updates.facebookLink = body.facebookLink || null;
    if (body.email !== undefined) updates.email = body.email || null;

    const organization = await updateOrganization(
      id,
      updates,
      parsedVersion.version,
      auth.editedBy,
    );

    return new Response(JSON.stringify({ success: true, organization }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof EditConflictError) {
      return new Response(
        JSON.stringify({
          error: "This organization was changed by another editor.",
          latest: err.latest,
        }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      );
    }

    console.error("Failed to update organization:", err);
    return new Response(
      JSON.stringify({ error: "Failed to save organization" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
