import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import { parseRequiredEditorVersion } from "@lib/admin/expected-version";
import {
  EditConflictError,
  updateDorm,
  DuplicateNameError,
} from "@lib/services/admin-service";

export const prerender = false;

type DormPatchBody = {
  dormName?: string;
  shortName?: string;
  lat?: number | null;
  lon?: number | null;
  gender?: string;
  capacity?: number | null;
  managingOffice?: string | null;
  contactEmail?: string | null;
  amenities?: string[];
  osmLink?: string | null;
  description?: string | null;
  isUpManaged?: boolean;
  priceRange?: string | null;
  contactPhone?: string[];
  facebookLink?: string | null;
  version?: number;
};

export const PATCH: APIRoute = async ({ cookies, params, request }) => {
  const auth = editorSessionOrUnauthorized(cookies, { requirePublish: true });
  if (auth instanceof Response) return auth;

  const id = parseInt(params.id ?? "", 10);
  if (Number.isNaN(id)) {
    return new Response(JSON.stringify({ error: "Invalid dorm ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: DormPatchBody;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (body.dormName !== undefined && body.dormName.trim().length === 0) {
    return new Response(JSON.stringify({ error: "Dorm name is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsedVersion = parseRequiredEditorVersion(body.version);
  if (!parsedVersion.ok) return parsedVersion.response;
  const expectedVersion = parsedVersion.version;

  try {
    const updates: Parameters<typeof updateDorm>[1] = {};
    if (body.dormName !== undefined) updates.dormName = body.dormName.trim();
    if (body.shortName !== undefined)
      updates.shortName = body.shortName || null;
    if (body.lat !== undefined)
      updates.lat = body.lat === null ? null : Number(body.lat);
    if (body.lon !== undefined)
      updates.lon = body.lon === null ? null : Number(body.lon);
    if (body.gender !== undefined) updates.gender = body.gender || "Mixed";
    if (body.capacity !== undefined) {
      updates.capacity = body.capacity === null ? null : Number(body.capacity);
    }
    if (body.managingOffice !== undefined) {
      updates.managingOffice = body.managingOffice || null;
    }
    if (body.contactEmail !== undefined)
      updates.contactEmail = body.contactEmail || null;
    if (body.amenities !== undefined) {
      updates.amenities = Array.isArray(body.amenities) ? body.amenities : [];
    }
    if (body.osmLink !== undefined) updates.osmLink = body.osmLink || null;
    if (body.description !== undefined)
      updates.description = body.description || null;
    if (body.isUpManaged !== undefined)
      updates.isUpManaged = body.isUpManaged !== false;
    if (body.priceRange !== undefined)
      updates.priceRange = body.priceRange || null;
    if (body.contactPhone !== undefined) {
      updates.contactPhone = Array.isArray(body.contactPhone)
        ? body.contactPhone
        : [];
    }
    if (body.facebookLink !== undefined)
      updates.facebookLink = body.facebookLink || null;

    const dorm = await updateDorm(id, updates, expectedVersion, auth.editedBy);

    return new Response(JSON.stringify({ success: true, dorm }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof EditConflictError) {
      return new Response(
        JSON.stringify({
          error: "This dorm was changed by another editor.",
          latest: err.latest,
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (err instanceof DuplicateNameError) {
      return new Response(
        JSON.stringify({
          error: err.message,
          code: "duplicate_name",
          entityType: err.entityType,
          mergeCandidate: err.candidate,
          attemptedName: err.attemptedName,
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    console.error("Failed to update dorm:", err);
    return new Response(JSON.stringify({ error: "Failed to save dorm" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
