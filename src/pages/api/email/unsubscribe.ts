import type { APIRoute } from "astro";
import { verifyUnsubscribeToken } from "@lib/email/unsubscribe";
import { unsubscribeFromTopic } from "@lib/services/notification-preferences-service";

export const prerender = false;

/**
 * One-click unsubscribe (RFC 8058): mail clients POST here from the
 * List-Unsubscribe header, and the /unsubscribe page's button does the same.
 * GET never changes anything, because link scanners prefetch email links.
 * The signed token is the only credential; it names one user and topic.
 */
export const POST: APIRoute = async ({ url, request }) => {
  let token = url.searchParams.get("token") ?? "";
  if (!token) {
    const form = await request.formData().catch(() => null);
    const value = form?.get("token");
    token = typeof value === "string" ? value : "";
  }
  const target = verifyUnsubscribeToken(token);
  if (!target) {
    return json(
      { error: "This unsubscribe link is invalid or has expired." },
      400,
    );
  }
  try {
    await unsubscribeFromTopic(target.userId, target.topic);
    return json({ success: true, topic: target.topic });
  } catch (error) {
    console.error("Unsubscribe failed:", error);
    return json({ error: "Could not unsubscribe. Try again." }, 500);
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
