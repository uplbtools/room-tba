import { db } from '#lib/server/db/index.js';
import { updateTable } from '#lib/server/db/schema.js';
import type { RequestHandler } from './$types';

/**
 * Every table's sync key in one response (#866). Boot needs eight of them, and
 * as separate `/api/check/<name>` probes that was eight round trips at ~500 ms
 * each before the first campus fetch could start. `/api/check/[name]` stays
 * for compatibility.
 */
export const GET: RequestHandler = async () => {
	let rows: (typeof updateTable.$inferSelect)[];
	try {
		rows = await db.select().from(updateTable);
	} catch (e) {
		console.error('Sync check failed:', e);
		return new Response(
			JSON.stringify({
				success: false,
				data: null,
				error:
					'Sync registry unavailable. Apply pending DB migrations (drizzle/0016_ensure_update_sync_table.sql).'
			}),
			{ status: 503 }
		);
	}

	const data: Record<string, string | null> = {};
	for (const row of rows) {
		if (row.tableName) data[row.tableName] = row.syncKey;
	}

	return new Response(JSON.stringify({ success: true, error: null, data }));
};
