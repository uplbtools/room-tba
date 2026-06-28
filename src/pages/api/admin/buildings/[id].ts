import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import { parseRequiredEditorVersion } from "@lib/admin/expected-version";
import {
  EditConflictError,
  updateBuilding,
} from "@lib/services/admin-service";

export const prerender = false;

type BuildingPatchBody = {
  buildingName?: string;
  lat?: number;
  lon?: number;
  buildingType?: "admin" | "non-admin";
  directions?: string;
  version?: number;
};

export const PATCH: APIRoute = async ({ cookies, params, request }) => {
  const auth = editorSessionOrUnauthorized(cookies, { requirePublish: true });
  if (auth instanceof Response) return auth;

  const id = parseInt(params["id"] ?? "");
  if (isNaN(id)) {
    return new Response(JSON.stringify({ error: "Invalid building ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: BuildingPatchBody;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (
    body.buildingName !== undefined &&
    body.buildingName.trim().length === 0
  ) {
    return new Response(
      JSON.stringify({ error: "Building name cannot be empty" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (
    body.buildingType &&
    !["admin", "non-admin"].includes(body.buildingType)
  ) {
    return new Response(JSON.stringify({ error: "Invalid building type" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsedVersion = parseRequiredEditorVersion(body.version);
  if (!parsedVersion.ok) return parsedVersion.response;
  const expectedVersion = parsedVersion.version;

  try {
    const updates: NonNullable<Parameters<typeof updateBuilding>[1]> = {};
    if (body.buildingName !== undefined)
      updates.buildingName = body.buildingName.trim();
    if (body.lat !== undefined) updates.lat = body.lat;
    if (body.lon !== undefined) updates.lon = body.lon;
    if (body.buildingType !== undefined)
      updates.buildingType = body.buildingType;
    if (body.directions !== undefined) updates.directions = body.directions;

    const building = await updateBuilding(
      id,
      updates,
      expectedVersion,
      auth.editedBy,
    );

    return new Response(JSON.stringify({ success: true, building }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof EditConflictError) {
      return new Response(
        JSON.stringify({
          error: "This building was changed by another editor.",
          latest: err.latest,
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    console.error("Failed to update building:", err);
    return new Response(JSON.stringify({ error: "Failed to save building" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
