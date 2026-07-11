import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import { parseRequiredEditorVersion } from "@lib/admin/expected-version";
import { updateJeepneyStop } from "@lib/services/transit-service";
import { EditConflictError } from "@lib/services/edit-conflict-error";

export const prerender = false;

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
    return json({ error: "Invalid stop ID." }, 400);
  }
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) return json({ error: "Invalid JSON body." }, 400);
  const parsedVersion = parseRequiredEditorVersion(body.version);
  if (!parsedVersion.ok) return parsedVersion.response;

  const updates: Parameters<typeof updateJeepneyStop>[1] = {};
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return json({ error: "Stop name is required." }, 400);
    }
    updates.name = body.name.trim();
  }
  if (body.description !== undefined) {
    if (typeof body.description !== "string" || !body.description.trim()) {
      return json({ error: "Stop description is required." }, 400);
    }
    updates.description = body.description.trim();
  }
  for (const field of ["lat", "lon"] as const) {
    if (body[field] !== undefined) {
      const value = Number(body[field]);
      if (!Number.isFinite(value)) {
        return json({ error: "Enter a valid stop location." }, 400);
      }
      updates[field] = value;
    }
  }
  if (body.sortOrder !== undefined) {
    const sortOrder = Number(body.sortOrder);
    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      return json({ error: "Enter a valid stop order." }, 400);
    }
    updates.sortOrder = sortOrder;
  }
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") {
      return json({ error: "Invalid stop status." }, 400);
    }
    updates.isActive = body.isActive;
  }

  try {
    const stop = await updateJeepneyStop(
      id,
      updates,
      parsedVersion.version,
      auth.editedBy,
    );
    return stop
      ? json({ success: true, stop })
      : json({ error: "Stop not found." }, 404);
  } catch (error) {
    if (error instanceof EditConflictError) {
      return json(
        {
          error: "This stop was changed by another editor.",
          latest: error.latest,
        },
        409,
      );
    }
    console.error("Failed to update jeepney stop:", error);
    return json({ error: "Failed to save stop." }, 500);
  }
};
