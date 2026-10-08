import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import {
  getNotificationPreferences,
  type NotificationPreferences,
  updateNotificationPreferences,
} from "@lib/services/notification-preferences-service";

export const prerender = false;

/** Email notification switches for Account settings (auth audit item 20). */
export const GET: APIRoute = async ({ cookies }) => {
  const auth = await editorSessionOrUnauthorized(cookies);
  if (auth instanceof Response) return auth;
  try {
    return json(await getNotificationPreferences(auth.session.id));
  } catch (error) {
    console.error("Load notification preferences failed:", error);
    return json({ error: "Could not load email preferences." }, 500);
  }
};

export const PATCH: APIRoute = async ({ cookies, request }) => {
  const auth = await editorSessionOrUnauthorized(cookies);
  if (auth instanceof Response) return auth;

  let body: { digest?: unknown; reviewNotices?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const patch: Partial<NotificationPreferences> = {};
  if (typeof body.digest === "boolean") patch.digest = body.digest;
  if (typeof body.reviewNotices === "boolean") {
    patch.reviewNotices = body.reviewNotices;
  }
  if (Object.keys(patch).length === 0) {
    return json({ error: "Nothing to update." }, 400);
  }
  try {
    return json(await updateNotificationPreferences(auth.session.id, patch));
  } catch (error) {
    console.error("Update notification preferences failed:", error);
    return json({ error: "Could not save email preferences." }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
    },
  });
}
