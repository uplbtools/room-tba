import type { APIRoute } from "astro";
import { cronAuthError, cronJson } from "@lib/api/cron-auth";
import { retryDueNotifications } from "@lib/notifications/outbox";

export const prerender = false;

/**
 * Retry Discord/gateway notifications that failed or never got their
 * after-response attempt (auth audit item 12). Vercel Cron, every 10 minutes.
 */
export const GET: APIRoute = async ({ request }) => {
  const denied = cronAuthError(request);
  if (denied) return denied;

  try {
    const result = await retryDueNotifications();
    return cronJson({ success: true, ...result });
  } catch (error) {
    console.error("Notification outbox sweep failed:", error);
    return cronJson({ error: "Outbox sweep failed." }, 500);
  }
};
