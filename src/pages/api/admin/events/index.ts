import type { APIRoute } from "astro";
import {
  ADMIN_COOKIE_NAME,
  verifySessionToken,
} from "../../../../lib/admin/auth";
import { createEvent } from "../../../../lib/services/admin-service";
import { slugifySegment } from "../../../../lib/site";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, request }) => {
  if (!verifySessionToken(cookies.get(ADMIN_COOKIE_NAME)?.value)) {
    return json({ error: "Unauthorized" }, 401);
  }

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

  const event = await createEvent({
    ...body,
    title,
    includeInSeo: true,
    slug:
      typeof body.slug === "string" && body.slug.trim()
        ? slugifySegment(body.slug)
        : slugifySegment(title),
  });

  return json({ success: true, event }, 201);
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
