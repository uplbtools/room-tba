import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "../../../../lib/admin/require-editor";
import {
  createEvent,
  DuplicateSlugError,
} from "../../../../lib/services/admin-service";
import { slugifySegment } from "../../../../lib/site";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, request }) => {
  const auth = editorSessionOrUnauthorized(cookies, { requirePublish: true });
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return json({ error: "Event title is required" }, 400);
  if (typeof body.startsAt !== "string" || typeof body.endsAt !== "string") {
    return json({ error: "Event start and end timestamps are required" }, 400);
  }

  const slug =
    typeof body.slug === "string" && body.slug.trim()
      ? slugifySegment(body.slug)
      : slugifySegment(title);

  try {
    const event = await createEvent(
      {
        ...body,
        title,
        slug,
        includeInSeo:
          typeof body.includeInSeo === "boolean" ? body.includeInSeo : true,
      },
      auth.editedBy,
    );

    return json({ success: true, event }, 201);
  } catch (err) {
    if (err instanceof DuplicateSlugError) {
      return json({ error: err.message }, 409);
    }
    console.error("Failed to create event:", err);
    return json({ error: "Failed to create event" }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
