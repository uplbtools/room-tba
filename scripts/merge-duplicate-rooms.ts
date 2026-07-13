/**
 * Merge duplicate room rows — same code modulo case/spacing/punctuation
 * ("BALH 1" / "BALH1" / "Balh1") — into one canonical row.
 *
 * Canonical = the row with the most metadata (building, directions, image,
 * category, map position); ties break to the lowest id. Every reference
 * (classes, final_exams, organizations, room_positions, aliases,
 * edit_proposals, editor_history) is repointed, then the duplicates are
 * deleted. The freed code variants keep matching the canonical room through
 * the import matcher's squashed-key tier.
 *
 * Dry-run by default; pass --apply to write.
 *
 *   DATABASE_URL=… bun run scripts/merge-duplicate-rooms.ts [--apply]
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import pg from "pg";

config({ path: ".env" });

const apply = process.argv.includes("--apply");

function squash(code: string) {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function main() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool);

  try {
    const { rows: rooms } = await pool.query<{
      id: number;
      room_code: string;
      building_id: number | null;
      directions: string | null;
      image_url: string | null;
      category: string | null;
      has_position: boolean;
    }>(`
      SELECT r.id, r.room_code, r.building_id, r.directions, r.image_url,
             r.category,
             EXISTS (SELECT 1 FROM room_positions p WHERE p.room_id = r.id)
               AS has_position
      FROM rooms r
    `);

    const groups = new Map<string, typeof rooms>();
    for (const room of rooms) {
      const key = squash(room.room_code);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)?.push(room);
    }

    const merges: { keep: (typeof rooms)[number]; drop: typeof rooms }[] = [];
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      const score = (room: (typeof rooms)[number]) =>
        Number(room.building_id != null) +
        Number(room.directions != null) +
        Number(room.image_url != null) +
        Number(room.category != null) +
        Number(room.has_position);
      group.sort((a, b) => score(b) - score(a) || a.id - b.id);
      merges.push({ keep: group[0], drop: group.slice(1) });
    }

    console.log(`Duplicate groups: ${merges.length}`);
    for (const merge of merges) {
      console.log(
        `  keep #${merge.keep.id} "${merge.keep.room_code}"  <=  ${merge.drop
          .map((room) => `#${room.id} "${room.room_code}"`)
          .join(", ")}`,
      );
    }

    if (!apply) {
      console.log("\nDry run. Pass --apply to write.");
      return;
    }

    await db.transaction(async (tx) => {
      for (const merge of merges) {
        const keepId = merge.keep.id;
        const dropIds = merge.drop.map((room) => room.id);

        await tx.execute(sql`
          UPDATE classes SET room_id = ${keepId}
          WHERE room_id IN ${sql.raw(`(${dropIds.join(",")})`)}`);
        await tx.execute(sql`
          UPDATE final_exams SET room_id = ${keepId}
          WHERE room_id IN ${sql.raw(`(${dropIds.join(",")})`)}`);
        await tx.execute(sql`
          UPDATE organizations SET room_id = ${keepId}
          WHERE room_id IN ${sql.raw(`(${dropIds.join(",")})`)}`);
        // Positions: keep the canonical's; a duplicate's position only moves
        // over when the canonical has none.
        if (merge.keep.has_position) {
          await tx.execute(sql`
            DELETE FROM room_positions
            WHERE room_id IN ${sql.raw(`(${dropIds.join(",")})`)}`);
        } else {
          await tx.execute(sql`
            UPDATE room_positions SET room_id = ${keepId}
            WHERE id = (
              SELECT id FROM room_positions
              WHERE room_id IN ${sql.raw(`(${dropIds.join(",")})`)}
              ORDER BY updated_at DESC LIMIT 1)`);
          await tx.execute(sql`
            DELETE FROM room_positions
            WHERE room_id IN ${sql.raw(`(${dropIds.join(",")})`)}`);
        }
        await tx.execute(sql`
          DELETE FROM aliases
          WHERE target_type = 'room'
            AND target_id IN ${sql.raw(`(${dropIds.join(",")})`)}
            AND normalized_alias IN (
              SELECT normalized_alias FROM aliases
              WHERE target_type = 'room' AND target_id = ${keepId})`);
        await tx.execute(sql`
          UPDATE aliases SET target_id = ${keepId}
          WHERE target_type = 'room'
            AND target_id IN ${sql.raw(`(${dropIds.join(",")})`)}`);
        await tx.execute(sql`
          UPDATE edit_proposals SET entity_id = ${keepId}
          WHERE entity_type = 'room'
            AND entity_id IN ${sql.raw(`(${dropIds.join(",")})`)}`);
        await tx.execute(sql`
          UPDATE editor_history SET entity_id = ${keepId}
          WHERE entity_type = 'room'
            AND entity_id IN ${sql.raw(`(${dropIds.join(",")})`)}`);
        await tx.execute(sql`
          DELETE FROM rooms
          WHERE id IN ${sql.raw(`(${dropIds.join(",")})`)}`);
      }
      // Cosmetic: kept codes can carry double spaces ("CEM  202").
      await tx.execute(sql`
        UPDATE rooms SET room_code = regexp_replace(room_code, '\\s{2,}', ' ', 'g')
        WHERE room_code ~ '\\s{2}'`);
      await tx.execute(sql`
        UPDATE "update" SET sync_key = gen_random_uuid()
        WHERE table_name IN ('rooms', 'classes', 'final_exams')`);
    });
    console.log(`\nMerged ${merges.length} duplicate groups.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
