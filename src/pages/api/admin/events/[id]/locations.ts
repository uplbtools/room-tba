import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import { parseRequiredEditorVersion } from "@lib/admin/expected-version";
import {
  EditConflictError,
  updateEventLocations,
  type EventLocationWriteInput,
} from "@lib/services/admin-service";

export const prerender = false;

type LocationsPatchBody = {
  version?: number;
  locations?: EventLocationWriteInput[];
};

export const PATCH: APIRoute = async ({ cookies, params, request }) => {
  const auth = await editorSessionOrUnauthorized(cookies, {
    requirePublish: true,
  });
  if (auth instanceof Response) return auth;

  const id = Number(params.id);
  if (!Number.isInteger(id)) return json({ error: "Invalid event ID" }, 400);

  let body: LocationsPatchBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!Array.isArray(body.locations)) {
    return json({ error: "locations must be an array" }, 400);
  }

  const parsedVersion = parseRequiredEditorVersion(body.version);
  if (!parsedVersion.ok) return parsedVersion.response;

  try {
    const event = await updateEventLocations(
      id,
      body.locations,
      parsedVersion.version,
      auth.editedBy,
    );
    if (!event) return json({ error: "Event not found" }, 404);
    return json({ success: true, event });
  } catch (err) {
    if (err instanceof EditConflictError) {
      return json(
        {
          error: "This event was changed by another editor.",
          latest: err.latest,
        },
        409,
      );
    }
    console.error("Failed to update event locations:", err);
    return json({ error: "Failed to save event locations" }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
