import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "../../../../lib/admin/require-editor";
import {
  EditConflictError,
  updateDivision,
  type DivisionUpdateInput,
} from "../../../../lib/services/admin-service";

export const prerender = false;

type DivisionPatchBody = {
  divisionName?: string;
  collegeId?: number | null;
  version?: number;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function invalidCollegeId(value: unknown) {
  return value !== undefined && value !== null && !Number.isInteger(value);
}

export const PATCH: APIRoute = async ({ cookies, params, request }) => {
  const auth = editorSessionOrUnauthorized(cookies, { requirePublish: true });
  if (auth instanceof Response) return auth;

  const id = parseInt(params["id"] ?? "");
  if (isNaN(id)) {
    return json({ error: "Invalid division ID" }, 400);
  }

  let body: DivisionPatchBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (
    body.divisionName !== undefined &&
    body.divisionName.trim().length === 0
  ) {
    return json({ error: "Division name is required" }, 400);
  }
  if (invalidCollegeId(body.collegeId)) {
    return json({ error: "College must be a valid selection" }, 400);
  }

  const expectedVersion = Number.isInteger(body.version)
    ? body.version
    : undefined;

  const updates: DivisionUpdateInput = {};
  if (body.divisionName !== undefined) {
    updates.divisionName = body.divisionName.trim();
  }
  if (body.collegeId !== undefined) {
    updates.collegeId = body.collegeId;
  }

  if (Object.keys(updates).length === 0) {
    return json({ error: "No division fields to update" }, 400);
  }

  try {
    const division = await updateDivision(
      id,
      updates,
      expectedVersion,
      auth.editedBy,
    );

    return json({ success: true, division });
  } catch (err) {
    if (err instanceof EditConflictError) {
      return json(
        {
          error: "This division was changed by another editor.",
          latest: err.latest,
        },
        409,
      );
    }

    console.error("Failed to update division:", err);
    return json({ error: "Failed to save division" }, 500);
  }
};
