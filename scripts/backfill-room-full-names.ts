/**
 * Populate rooms.full_name from aliases that spell out an abbreviated room
 * code (#875).
 *
 * The 2026-08-04 duplicate merge kept every removed spelling as an alias on the
 * surviving room, so room `DSDS MLH` already carries `DSDS Main Lecture Hall`.
 * This promotes that alias to full_name. Aliases that are only spelling
 * variants (`DSDS-MLH`) are left alone; see src/lib/room-full-name.ts for the
 * matching rules and its unit test for the accepted/rejected shapes.
 *
 * Dry-run by default; pass --apply to write. Rooms that already have a
 * full_name are skipped unless --overwrite is passed.
 *
 *   DATABASE_URL=… bun run scripts/backfill-room-full-names.ts [--apply]
 *
 * Refuses to touch production unless --allow-prod is passed as well, because
 * the alias heuristic should be reviewed on staging output first.
 */

import pg from 'pg';
import { pickRoomFullName } from '../src/lib/room-full-name';
import { loadEnv } from './load-env';

loadEnv();

const PROD_PROJECT_REF = 'ccdqtmscmnixjbynwdvb';

const apply = process.argv.includes('--apply');
const overwrite = process.argv.includes('--overwrite');
const allowProd = process.argv.includes('--allow-prod');

type RoomRow = { id: number; room_code: string; full_name: string | null };
type AliasRow = { target_id: number; alias: string };

function resolveDatabaseUrl(): string {
	const url = process.env.DATABASE_URL?.trim();
	if (!url) throw new Error('DATABASE_URL is required');
	if (url.includes(PROD_PROJECT_REF) && !allowProd) {
		throw new Error(
			`Refusing to run against production (${PROD_PROJECT_REF}). ` +
				'Review the dry-run output on staging first, then pass --allow-prod.'
		);
	}
	return url;
}

async function main() {
	const pool = new pg.Pool({ connectionString: resolveDatabaseUrl() });

	try {
		const { rows: rooms } = await pool.query<RoomRow>(
			'SELECT id, room_code, full_name FROM rooms ORDER BY id'
		);
		const { rows: aliases } = await pool.query<AliasRow>(
			"SELECT target_id, alias FROM aliases WHERE target_type = 'room'"
		);

		const aliasesByRoom = new Map<number, string[]>();
		for (const row of aliases) {
			const list = aliasesByRoom.get(row.target_id) ?? [];
			list.push(row.alias);
			aliasesByRoom.set(row.target_id, list);
		}

		const updates: { id: number; code: string; fullName: string }[] = [];
		let skippedExisting = 0;

		for (const room of rooms) {
			if (room.full_name && !overwrite) {
				skippedExisting += 1;
				continue;
			}
			const candidates = aliasesByRoom.get(room.id) ?? [];
			const fullName = pickRoomFullName(room.room_code, candidates);
			if (!fullName || fullName === room.full_name) continue;
			updates.push({ id: room.id, code: room.room_code, fullName });
		}

		for (const update of updates) {
			console.log(`${update.code}  ->  ${update.fullName}`);
		}
		console.log(
			`\n${rooms.length} rooms, ${aliases.length} room aliases, ` +
				`${updates.length} to set, ${skippedExisting} already named.`
		);

		if (!apply) {
			console.log('Dry run. Re-run with --apply to write.');
			return;
		}

		for (const update of updates) {
			// ponytail: no version bump. full_name is not an editable field, and
			// bumping it would stale every open edit proposal into a 409.
			await pool.query('UPDATE rooms SET full_name = $1 WHERE id = $2', [
				update.fullName,
				update.id
			]);
		}
		// Cached clients only re-fetch rooms when the sync key moves.
		await pool.query(
			'UPDATE "update" SET sync_key = gen_random_uuid() WHERE table_name = \'rooms\''
		);
		console.log(`Applied ${updates.length} full names.`);
	} finally {
		await pool.end();
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
