/**
 * Apply the approved room-name consolidation for #875.
 *
 * A room code stays short; its readable spelling is stored in full_name and
 * all historic/current AMIS spellings are aliases. Dry-run by default.
 *
 *   bun run consolidate:approved-rooms
 *   bun run consolidate:approved-rooms -- --apply --allow-prod
 */

import pg from "pg";
import { loadEnv } from "./load-env";

loadEnv();

const PROD_PROJECT_REF = "ccdqtmscmnixjbynwdvb";
const OP_KEY = "2026-08-10-approved-room-names";
const SOURCE = "room_name_consolidation";
const apply = process.argv.includes("--apply");
const allowProd = process.argv.includes("--allow-prod");

type Group = { code: string; fullName: string; aliases: string[] };

// Maintainer-approved groups from #875, supplemented only with spelling
// variants found in the current AMIS 1261 export.
const GROUPS: Group[] = [
  {
    code: "DSDS MLH",
    fullName: "DSDS Main Lecture Hall",
    aliases: [
      "DSDS MLH (Main Lecture Hall)",
      "DSDS Main Lecture Hall",
      "DSDS Main Lecture Hall (MLH)",
      "SDS MLH",
      "SDS MAIN LECTURE HALL (MLH)",
    ],
  },
  {
    code: "CERP CONF",
    fullName: "CERP Conference Room",
    aliases: ["CERP Conf Room", "CERP Conference Room", "CERP Conf Rm"],
  },
  {
    code: "Fronda Hall RM. 24",
    fullName: "Fronda Hall Room 24",
    aliases: [
      "Fronda RM. 24",
      "Room 24 - Fronda Hall",
      "Fronda Hall-RM. 24",
      "Rm 24 Fronda",
    ],
  },
  {
    code: "DBVS LR",
    fullName: "DBVS Lecture Room",
    aliases: ["DBVS Lecture Room"],
  },
  {
    code: "CDC RM 201B",
    fullName: "CDC Room 201B",
    aliases: ["CDC RM201B", "CDC Room 201B"],
  },
  {
    code: "CDC CONF",
    fullName: "CDC Conference Room",
    aliases: ["CDC Conference Rm", "CDC Conference Room"],
  },
  {
    code: "CDC GRAD",
    fullName: "CDC Graduate Room",
    aliases: [
      "CDC GRAD ROOM",
      "CDC GRAD RM",
      "CDC GRADRM",
      "CDC Graduate Room",
    ],
  },
  { code: "IAS RM. 1", fullName: "IAS Room 1", aliases: ["IAS Room 1"] },
  {
    code: "Animal Health Lab",
    fullName: "Animal Health Laboratory",
    aliases: ["Animal Health Laboratory"],
  },
  {
    code: "General Physio Lab (Rm. 100)",
    fullName: "General Physiology Lab (Rm. 100)",
    aliases: ["General Physiology Lab (Rm. 100)"],
  },
  {
    code: "Fronda GSR",
    fullName: "Fronda Hall - Graduate Student Room (GSR)",
    aliases: [
      "Fronda Hall -  Graduate Student Room (GSR)",
      "Fronda Hall - Graduate Student Room (GSR)",
    ],
  },
  {
    code: "SDS Lab",
    fullName: "DSDS SDS Lab",
    aliases: ["SDS lab", "DSDS SDS Lab"],
  },
  {
    code: "Malacology Lab",
    fullName: "Malacology Laboratory (BS Snail Room)",
    aliases: [
      "Malacology Lab (Snail Room)",
      "Malacology Laboratory (BS Snail Room)",
    ],
  },
  {
    code: "CFNR Varrons Room",
    fullName: "Varrons Room",
    aliases: ["Varrons Room", "AdminBldg_VarronsRm"],
  },
  {
    code: "IABE Meeting Room",
    fullName: "IABE DO Meeting Room",
    aliases: ["IABE DO Meeting Room"],
  },
  {
    code: "PHYSIO LR",
    fullName: "Animal Physiology Lecture Room",
    aliases: ["Animal Physiology Lecture Room"],
  },
];

type Room = {
  id: number;
  room_code: string;
  full_name: string | null;
  version: number;
};

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function dbUrl() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is required");
  if (url.includes(PROD_PROJECT_REF) && apply && !allowProd) {
    throw new Error("Refusing production write without --allow-prod");
  }
  return url;
}

async function repoint(
  client: pg.PoolClient,
  keepId: number,
  dropIds: number[],
) {
  if (dropIds.length === 0) return;
  const values = [keepId, dropIds];
  for (const table of ["classes", "final_exams", "organizations"]) {
    await client.query(
      `UPDATE ${table} SET room_id = $1 WHERE room_id = ANY($2::int[])`,
      values,
    );
  }
  const { rows: positions } = await client.query<{ id: number }>(
    "SELECT id FROM room_positions WHERE room_id = ANY($1::int[]) ORDER BY updated_at DESC",
    [dropIds],
  );
  const { rowCount: keepPosition } = await client.query(
    "SELECT 1 FROM room_positions WHERE room_id = $1 LIMIT 1",
    [keepId],
  );
  if (!keepPosition && positions[0]) {
    await client.query("UPDATE room_positions SET room_id = $1 WHERE id = $2", [
      keepId,
      positions[0].id,
    ]);
  }
  await client.query(
    "DELETE FROM room_positions WHERE room_id = ANY($1::int[])",
    [dropIds],
  );
  await client.query(
    "DELETE FROM aliases dropped USING aliases kept WHERE dropped.target_type = 'room' AND kept.target_type = 'room' AND dropped.target_id = ANY($1::int[]) AND kept.target_id = $2 AND dropped.normalized_alias = kept.normalized_alias",
    [dropIds, keepId],
  );
  await client.query(
    "UPDATE aliases SET target_id = $1 WHERE target_type = 'room' AND target_id = ANY($2::int[])",
    values,
  );
  for (const table of ["edit_proposals", "editor_history"]) {
    await client.query(
      `UPDATE ${table} SET entity_id = $1 WHERE entity_type = 'room' AND entity_id = ANY($2::int[])`,
      values,
    );
  }
  await client.query("DELETE FROM rooms WHERE id = ANY($1::int[])", [dropIds]);
}

async function main() {
  const pool = new pg.Pool({ connectionString: dbUrl() });
  try {
    for (const group of GROUPS) {
      const spellings = [group.code, ...group.aliases];
      const { rows } = await pool.query<Room>(
        "SELECT id, room_code, full_name, version FROM rooms WHERE lower(room_code) = ANY($1::text[]) ORDER BY id",
        [spellings.map((value) => value.toLowerCase())],
      );
      if (rows.length === 0)
        throw new Error(`No current room found for ${group.code}`);
      const keep =
        rows.find(
          (room) => room.room_code.toLowerCase() === group.code.toLowerCase(),
        ) ?? rows[0];
      const drop = rows.filter((room) => room.id !== keep.id);
      console.log(
        `${group.code} <= ${rows.map((room) => `#${room.id} ${room.room_code}`).join(" | ")}`,
      );
      if (!apply) continue;

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const normalized = [...new Set(spellings.map(normalize))];
        const { rows: collisions } = await client.query<{
          normalized_alias: string;
          target_id: number;
        }>(
          "SELECT normalized_alias, target_id FROM aliases WHERE target_type = 'room' AND normalized_alias = ANY($1::text[]) AND target_id <> ALL($2::int[])",
          [normalized, [keep.id, ...drop.map((room) => room.id)]],
        );
        if (collisions.length)
          throw new Error(`Alias collision for ${group.code}`);
        await repoint(
          client,
          keep.id,
          drop.map((room) => room.id),
        );
        await client.query(
          "UPDATE rooms SET room_code = $1, full_name = $2, version = version + 1, updated_at = now() WHERE id = $3",
          [group.code, group.fullName, keep.id],
        );
        for (const alias of [...new Set([...group.aliases, group.fullName])]) {
          if (normalize(alias) === normalize(group.code)) continue;
          await client.query(
            "INSERT INTO aliases (alias, normalized_alias, target_type, target_id, source, confidence) VALUES ($1, $2, 'room', $3, $4, 'curated') ON CONFLICT (normalized_alias, target_type, target_id) DO NOTHING",
            [alias, normalize(alias), keep.id, SOURCE],
          );
        }
        const { rowCount } = await client.query(
          "SELECT 1 FROM editor_history WHERE entity_type = 'room' AND entity_id = $1 AND summary LIKE $2",
          [keep.id, `[bulk:${OP_KEY}]%`],
        );
        if (!rowCount) {
          await client.query(
            "INSERT INTO editor_history (entity_type, entity_id, action, before_snapshot, after_snapshot, version_before, version_after, edited_by, summary) VALUES ('room', $1, 'merge', $2::jsonb, $3::jsonb, $4, $5, 'maintenance-script', $6)",
            [
              keep.id,
              JSON.stringify(rows),
              JSON.stringify({
                roomCode: group.code,
                fullName: group.fullName,
                aliases: group.aliases,
                mergedRoomIds: drop.map((room) => room.id),
              }),
              keep.version,
              keep.version + 1,
              `[bulk:${OP_KEY}] Consolidated approved spellings for ${group.code}.`,
            ],
          );
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
    if (apply) {
      await pool.query(
        "UPDATE \"update\" SET sync_key = gen_random_uuid() WHERE table_name IN ('rooms', 'classes', 'final_exams', 'organizations')",
      );
      console.log(`Applied ${GROUPS.length} approved room groups.`);
    } else {
      console.log(
        `\n${GROUPS.length} approved groups. Dry run. Re-run with --apply --allow-prod to write.`,
      );
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
