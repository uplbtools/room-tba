/**
 * Verify Postgres has all required tables (migrations applied).
 *
 * Checks the schema the caller actually built: `E2E_SCHEMA` when set, `public`
 * otherwise. Since #773 nothing applies migrations to the E2E `public` schema,
 * so CI points this at a throwaway run schema it just migrated (#806); the
 * release workflow leaves `E2E_SCHEMA` unset and still checks prod `public`.
 */
import { connectE2eClient, e2eSchema } from "./e2e-schema";
import { loadEnv } from "./load-env";

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
  "announcements",
  "aliases",
  "update",
  "admin_users",
  "editor_history",
  "edit_proposals",
];

const REQUIRED_SYNC_ROWS = ["organizations", "places", "announcements"];

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for migration schema check");
  }

  const schema = e2eSchema() ?? "public";
  const client = await connectE2eClient(databaseUrl);
  try {
    const missing: string[] = [];
    for (const table of REQUIRED_TABLES) {
      const { rows } = await client.query<{ reg: string | null }>(
        "SELECT to_regclass($1) AS reg",
        [`${schema}.${table}`],
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
      `OK: ${REQUIRED_TABLES.length} required tables and ${REQUIRED_SYNC_ROWS.length} sync rows present in ${schema}`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
