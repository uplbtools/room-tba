import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "../../../../../lib/admin/require-editor";
import { parseRequiredEditorVersion } from "../../../../../lib/admin/expected-version";
import {
  EditConflictError,
  updateEvent,
  type EventRouteWriteInput,
} from "../../../../../lib/services/admin-service";

export const prerender = false;

type RoutesPatchBody = {
  version?: number;
  routes?: EventRouteWriteInput[];
};

export const PATCH: APIRoute = async ({ cookies, params, request }) => {
  const auth = editorSessionOrUnauthorized(cookies, { requirePublish: true });
  if (auth instanceof Response) return auth;

  const id = Number(params.id);
  if (!Number.isInteger(id)) return json({ error: "Invalid event ID" }, 400);

  let body: RoutesPatchBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!Array.isArray(body.routes)) {
    return json({ error: "routes must be an array" }, 400);
  }

  const parsedVersion = parseRequiredEditorVersion(body.version);
  if (!parsedVersion.ok) return parsedVersion.response;

  try {
    const event = await updateEvent(
      id,
      { routes: body.routes },
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
    console.error("Failed to update event routes:", err);
    return json({ error: "Failed to save event routes" }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
