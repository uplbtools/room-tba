/**
 * Verify Postgres has all required public tables (migrations applied).
 */
import { loadEnv } from "./load-env";
import pg from "pg";

loadEnv();

const REQUIRED_TABLES = [
  "terms",
  "buildings",
  "dorms",
  "colleges",
  "divisions",
  "rooms",
  "room_positions",
  "classes",
  "final_exams",
  "events",
  "event_locations",
  "event_routes",
  "event_route_stops",
  "organizations",
  "places",
  "aliases",
  "update",
  "admin_users",
  "editor_history",
  "edit_proposals",
];

const REQUIRED_SYNC_ROWS = ["organizations", "places"];

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for migration schema check");
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const missing: string[] = [];
    for (const table of REQUIRED_TABLES) {
      const { rows } = await client.query<{ reg: string | null }>(
        "SELECT to_regclass($1) AS reg",
        [`public.${table}`],
      );
      if (!rows[0]?.reg) missing.push(table);
    }
    if (missing.length > 0) {
      throw new Error(
        `Missing tables (apply drizzle migrations): ${missing.join(", ")}`,
      );
    }
    const { rows: syncRows } = await client.query<{ tableName: string }>(
      'SELECT table_name AS "tableName" FROM "update" WHERE table_name = ANY($1)',
      [REQUIRED_SYNC_ROWS],
    );
    const presentSyncRows = new Set(syncRows.map((row) => row.tableName));
    const missingSyncRows = REQUIRED_SYNC_ROWS.filter(
      (table) => !presentSyncRows.has(table),
    );
    if (missingSyncRows.length > 0) {
      throw new Error(
        `Missing sync registry rows (apply drizzle migrations): ${missingSyncRows.join(", ")}`,
      );
    }
    console.log(
      `OK: ${REQUIRED_TABLES.length} required tables and ${REQUIRED_SYNC_ROWS.length} sync rows present`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
