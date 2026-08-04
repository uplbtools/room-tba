import type { APIRoute } from "astro";
import { sql } from "drizzle-orm";
import { presenceTable } from "@drizzle/schema";
import { db } from "@lib/db";
import {
  ONLINE_WINDOW_SECONDS,
  PRESENCE_TTL_MINUTES,
  PRUNE_SAMPLE_RATE,
  isValidSid,
} from "@lib/presence";

export const prerender = false;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      // A shared cache would serve one visitor's count to everyone.
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Presence heartbeat: the client POSTs its random session id every 30s and
 * gets back the number of distinct sessions seen in the last 90s.
 *
 * Privacy: the session id is a client-generated UUID kept in `sessionStorage`,
 * never tied to an account. This endpoint stores nothing else — no IP address,
 * no user agent, no page path, no analytics event. The row is a sid and a
 * timestamp, and it is deleted once the session goes stale.
 */
export const POST: APIRoute = async ({ request }) => {
  let sid: unknown;
  try {
    ({ sid } = await request.json());
  } catch {
    return json({ error: "invalid body" }, 400);
  }
  if (!isValidSid(sid)) {
    return json({ error: "invalid sid" }, 400);
  }

  await db
    .insert(presenceTable)
    .values({ sid })
    .onConflictDoUpdate({
      target: presenceTable.sid,
      set: { lastSeenAt: sql`now()` },
    });

  // Opportunistic prune so the table stays tiny — no cron job to own.
  // ponytail: sampled on the request path; move to a cron if presence ever
  // grows past what a single DELETE on an indexed column can absorb.
  if (Math.random() < PRUNE_SAMPLE_RATE) {
    await db
      .delete(presenceTable)
      .where(
        sql`${presenceTable.lastSeenAt} < now() - make_interval(mins => ${PRESENCE_TTL_MINUTES})`,
      );
  }

  const [row] = await db
    .select({ online: sql<number>`count(*)::int` })
    .from(presenceTable)
    .where(
      sql`${presenceTable.lastSeenAt} > now() - make_interval(secs => ${ONLINE_WINDOW_SECONDS})`,
    );

  // The caller's own heartbeat is already committed, so the floor is 1.
  return json({ online: row?.online ?? 1 }, 200);
};
