import type { APIRoute } from "astro";
import {
  ADMIN_COOKIE_NAME,
  verifySessionToken,
} from "../../../../lib/admin/auth";
import {
  deactivateEvent,
  EditConflictError,
  updateEvent,
  type EventWriteInput,
} from "../../../../lib/services/admin-service";
import { slugifySegment } from "../../../../lib/site";

export const prerender = false;

type EventPatchBody = EventWriteInput & {
  version?: number;
};

export const PATCH: APIRoute = async ({ cookies, params, request }) => {
  if (!verifySessionToken(cookies.get(ADMIN_COOKIE_NAME)?.value)) {
    return json({ error: "Unauthorized" }, 401);
  }

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

  const expectedVersion = Number.isInteger(body.version)
    ? body.version
    : undefined;

  try {
    const updates: EventWriteInput = { ...body };
    if (updates.slug) updates.slug = slugifySegment(updates.slug);
    if (updates.title) updates.title = updates.title.trim();
    updates.includeInSeo = true;
    const event = await updateEvent(id, updates, expectedVersion);
    return json({ success: true, event });
  } catch (err) {
    return handleEventError(err);
  }
};

export const DELETE: APIRoute = async ({ cookies, params, request }) => {
  if (!verifySessionToken(cookies.get(ADMIN_COOKIE_NAME)?.value)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const id = parseEventId(params.id);
  if (id === null) return json({ error: "Invalid event ID" }, 400);
  const body = await request.json().catch(() => ({}) as { version?: number });
  const expectedVersion = Number.isInteger(body.version)
    ? body.version
    : undefined;

  try {
    const event = await deactivateEvent(id, expectedVersion);
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
