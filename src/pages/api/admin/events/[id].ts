import type { APIRoute } from "astro";
import { R2_PUBLIC_URL } from "astro:env/server";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import { parseRequiredEditorVersion } from "@lib/admin/expected-version";
import { parseEventImageUrl } from "@lib/r2-upload";
import {
  deactivateEvent,
  EditConflictError,
  updateEvent,
  type EventWriteInput,
} from "@lib/services/admin-service";
import { slugifySegment } from "@lib/site";

export const prerender = false;

type EventPatchBody = EventWriteInput & {
  version?: number;
};

export const PATCH: APIRoute = async ({ cookies, params, request }) => {
  const auth = await editorSessionOrUnauthorized(cookies, {
    requirePublish: true,
  });
  if (auth instanceof Response) return auth;

  const id = parseEventId(params.id);
  if (id === null) return json({ error: "Invalid event ID" }, 400);

  let body: EventPatchBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (body.title !== undefined && body.title.trim().length === 0) {
    return json({ error: "Event title cannot be empty" }, 400);
  }

  const parsedVersion = parseRequiredEditorVersion(body.version);
  if (!parsedVersion.ok) return parsedVersion.response;
  const expectedVersion = parsedVersion.version;

  const parsedImageUrl = parseEventImageUrl(body.imageUrl, R2_PUBLIC_URL);
  if (!parsedImageUrl.ok) {
    return json({ error: parsedImageUrl.error }, 400);
  }

  try {
    const updates: EventWriteInput = { ...body };
    if (updates.slug) updates.slug = slugifySegment(updates.slug);
    if (updates.title) updates.title = updates.title.trim();
    if (typeof body.includeInSeo === "boolean") {
      updates.includeInSeo = body.includeInSeo;
    }
    if (parsedImageUrl.provided) {
      updates.imageUrl = parsedImageUrl.imageUrl;
    }
    const event = await updateEvent(
      id,
      updates,
      expectedVersion,
      auth.editedBy,
    );
    if (!event) return json({ error: "Event not found" }, 404);
    return json({ success: true, event });
  } catch (err) {
    return handleEventError(err);
  }
};

export const DELETE: APIRoute = async ({ cookies, params, request }) => {
  const auth = await editorSessionOrUnauthorized(cookies, {
    requirePublish: true,
  });
  if (auth instanceof Response) return auth;

  const id = parseEventId(params.id);
  if (id === null) return json({ error: "Invalid event ID" }, 400);
  const body = await request.json().catch(() => ({}) as { version?: number });
  const parsedVersion = parseRequiredEditorVersion(body.version);
  if (!parsedVersion.ok) return parsedVersion.response;
  const expectedVersion = parsedVersion.version;

  try {
    const event = await deactivateEvent(id, expectedVersion, auth.editedBy);
    return json({ success: true, event });
  } catch (err) {
    return handleEventError(err);
  }
};

function parseEventId(value: string | undefined) {
  const id = Number(value);
  return Number.isInteger(id) ? id : null;
}

function handleEventError(err: unknown) {
  if (err instanceof EditConflictError) {
    return json(
      {
        error: "This event was changed by another editor.",
        latest: err.latest,
      },
      409,
    );
  }

  console.error("Failed to update event:", err);
  return json({ error: "Failed to save event" }, 500);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
