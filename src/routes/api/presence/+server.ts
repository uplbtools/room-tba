import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.js';
import { presenceTable } from '#lib/server/db/schema.js';
import type { RequestHandler } from './$types';

// Constants + sid validation inlined from astro/src/lib/presence.ts.
/** Sessions seen within this window count as online. */
const ONLINE_WINDOW_SECONDS = 90;
/** Rows past this age are dead weight and get pruned. */
const PRESENCE_TTL_MINUTES = 10;
/** Fraction of heartbeats that also prune, so no cron job is needed. */
const PRUNE_SAMPLE_RATE = 0.1;
/** Client UUIDs only: hex and dashes, length-bounded to the `varchar(64)` column. */
const SID_PATTERN = /^[a-zA-Z0-9-]{8,64}$/;

function isValidSid(sid: unknown): sid is string {
	return typeof sid === 'string' && SID_PATTERN.test(sid);
}

// A shared cache would serve one visitor's count to everyone.
const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * Presence heartbeat: the client POSTs its random session id every 30s and
 * gets back the number of distinct sessions seen in the last 90s.
 *
 * Privacy: the session id is a client-generated UUID kept in `sessionStorage`,
 * never tied to an account. This endpoint stores nothing else — no IP address,
 * no user agent, no page path, no analytics event. The row is a sid and a
 * timestamp, and it is deleted once the session goes stale.
 */
export const POST: RequestHandler = async ({ request }) => {
	let sid: unknown;
	try {
		({ sid } = await request.json());
	} catch {
		return json({ error: 'invalid body' }, { status: 400, headers: NO_STORE });
	}
	if (!isValidSid(sid)) {
		return json({ error: 'invalid sid' }, { status: 400, headers: NO_STORE });
	}

	try {
		await db
			.insert(presenceTable)
			.values({ sid })
			.onConflictDoUpdate({
				target: presenceTable.sid,
				set: { lastSeenAt: sql`now()` }
			});

		// Opportunistic prune so the table stays tiny — no cron job to own.
		if (Math.random() < PRUNE_SAMPLE_RATE) {
			await db
				.delete(presenceTable)
				.where(
					sql`${presenceTable.lastSeenAt} < now() - make_interval(mins => ${PRESENCE_TTL_MINUTES})`
				);
		}

		const [row] = await db
			.select({ online: sql<number>`count(*)::int` })
			.from(presenceTable)
			.where(
				sql`${presenceTable.lastSeenAt} > now() - make_interval(secs => ${ONLINE_WINDOW_SECONDS})`
			);

		// The caller's own heartbeat is already committed, so the floor is 1.
		return json({ online: row?.online ?? 1 }, { status: 200, headers: NO_STORE });
	} catch (e) {
		// DB auth / pooler / missing table: don't throw — the client counter
		// already treats non-OK as "--".
		console.error(e);
		return json({ online: 0, error: 'unavailable' }, { status: 503, headers: NO_STORE });
	}
};
