import type { APIRoute } from "astro";
import { db } from "@lib/db";
import { sponsorImpressionsTable } from "@drizzle/schema";

export const prerender = false;

const BOT_UA = /bot|crawl|spider|slurp|lighthouse/i;
const EVENT_TYPES = new Set(["impression", "click"]);
const MAX_FIELD_LENGTH = 200;

function ok(): Response {
  return new Response(null, { status: 200 });
}

/**
 * First-party sponsor impression/click beacon (see docs/ad-policy.md).
 * Always returns 200 for well-formed requests — bots are silently dropped and
 * a missing sponsor_impressions table degrades gracefully so the code can
 * ship before the migration lands.
 */
export const POST: APIRoute = async ({ request }) => {
  let body: {
    sponsorId?: unknown;
    zone?: unknown;
    eventType?: unknown;
    pagePath?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const { sponsorId, zone, eventType, pagePath } = body;
  if (
    typeof sponsorId !== "string" ||
    sponsorId.length === 0 ||
    sponsorId.length > MAX_FIELD_LENGTH ||
    typeof zone !== "string" ||
    zone.length === 0 ||
    zone.length > MAX_FIELD_LENGTH
  ) {
    return new Response(
      JSON.stringify({ error: "sponsorId and zone are required" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const userAgent = request.headers.get("user-agent") ?? "";
  if (BOT_UA.test(userAgent)) return ok();

  try {
    await db.insert(sponsorImpressionsTable).values({
      sponsorId,
      zone,
      eventType:
        typeof eventType === "string" && EVENT_TYPES.has(eventType)
          ? eventType
          : "impression",
      userAgent: userAgent.slice(0, 500) || null,
      pagePath:
        typeof pagePath === "string"
          ? pagePath.slice(0, MAX_FIELD_LENGTH)
          : null,
    });
  } catch {
    // Table may not exist yet (migration not applied) — degrade gracefully.
  }
  return ok();
};
