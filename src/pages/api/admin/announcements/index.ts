import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import { normalizeAnnouncementSeverity } from "@constants/announcement-severities";
import {
  createAnnouncement,
  listAnnouncements,
} from "@lib/services/announcement-service";
import { parseWallTimestamp } from "@lib/announcements";
import { sessionEditedBy } from "@lib/admin/auth";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Editors see every row, including expired and future-dated ones. */
export const GET: APIRoute = async ({ cookies }) => {
  const auth = await editorSessionOrUnauthorized(cookies, {
    requirePublish: true,
  });
  if (auth instanceof Response) return auth;

  try {
    return json({ success: true, announcements: await listAnnouncements() });
  } catch (error) {
    console.error("Failed to list announcements:", error);
    return json({ error: "Couldn't load announcements" }, 500);
  }
};

export const POST: APIRoute = async ({ cookies, request }) => {
  const auth = await editorSessionOrUnauthorized(cookies, {
    requirePublish: true,
  });
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!title) return json({ error: "Announcement title is required" }, 400);
  if (!text) return json({ error: "Announcement body is required" }, 400);

  const severity = normalizeAnnouncementSeverity(body.severity ?? "info");
  if (!severity) return json({ error: "Invalid severity" }, 400);

  const startsOn =
    body.startsOn === undefined || body.startsOn === null
      ? undefined
      : parseWallTimestamp(body.startsOn);
  if (startsOn === null) return json({ error: "Invalid start date" }, 400);

  const endsOn =
    body.endsOn === undefined || body.endsOn === null || body.endsOn === ""
      ? null
      : parseWallTimestamp(body.endsOn);
  if (body.endsOn && endsOn === null) {
    return json({ error: "Invalid end date" }, 400);
  }

  try {
    const announcement = await createAnnouncement({
      title,
      body: text,
      severity,
      ...(startsOn ? { startsOn } : {}),
      endsOn,
      linkUrl:
        typeof body.linkUrl === "string" ? body.linkUrl.trim() || null : null,
      author: sessionEditedBy(auth.session),
    });
    if (!announcement) return json({ error: "Couldn't post" }, 500);
    return json({ success: true, announcement }, 201);
  } catch (error) {
    console.error("Failed to create announcement:", error);
    return json({ error: "Couldn't post announcement" }, 500);
  }
};
