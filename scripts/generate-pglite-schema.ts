/**
 * Generate the offline PGlite init SQL from `drizzle/schema.ts` so the
 * browser cache can no longer drift from the server schema (schema.ts is the
 * single source of truth).
 *
 * For every synced table it emits:
 *   1. CREATE TABLE IF NOT EXISTS with all server columns (types relaxed for
 *      the cache: enums/date/time/timestamp become text, no FKs, no identity)
 *      plus the local-only columns (sync flags, resolved event fields).
 *   2. ALTER TABLE ADD COLUMN IF NOT EXISTS for every column, so caches
 *      created by older app versions pick up new columns.
 *
 * Output: src/lib/local/data/pglite-schema.generated.ts (committed; the drift
 * test in src/lib/local/data/pglite-schema.test.ts regenerates and compares).
 *
 * Usage: bun run scripts/generate-pglite-schema.ts
 */

import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import {
  aliasesTable,
  buildingsTable,
  classesTable,
  collegesTable,
  divisionsTable,
  dormsTable,
  eventLocationsTable,
  eventRoutesTable,
  eventRouteStopsTable,
  eventsTable,
  finalExamsTable,
  jeepneyRoutesTable,
  jeepneyStopsTable,
  organizationsTable,
  placesTable,
  roomPositionsTable,
  roomsTable,
} from "../drizzle/schema";

type LocalColumn = {
  name: string;
  type: string;
  notNull: boolean;
  default?: string;
  primaryKey?: boolean;
};

/** Columns that exist only in the offline cache (sync bookkeeping and
 * server-resolved event fields), appended after the server columns. */
const LOCAL_ONLY: Record<string, LocalColumn[]> = {
  buildings: [
    {
      name: "rooms_fetched",
      type: "boolean",
      notNull: true,
      default: "false",
    },
  ],
  colleges: [
    {
      name: "rooms_fetched",
      type: "boolean",
      notNull: true,
      default: "false",
    },
  ],
  divisions: [
    {
      name: "rooms_fetched",
      type: "boolean",
      notNull: true,
      default: "false",
    },
  ],
  rooms: [
    {
      name: "classes_fetched",
      type: "boolean",
      notNull: true,
      default: "false",
    },
  ],
  // The classes API returns a precomputed `directions` string for offline use.
  classes: [{ name: "directions", type: "text", notNull: false }],
  events: [
    { name: "status", type: "varchar(16)", notNull: true, default: "'past'" },
    {
      name: "occurrence_starts_at",
      type: "text",
      notNull: true,
      default: "CURRENT_TIMESTAMP",
    },
    {
      name: "occurrence_ends_at",
      type: "text",
      notNull: true,
      default: "CURRENT_TIMESTAMP",
    },
  ],
  event_locations: [
    { name: "resolved_lat", type: "double precision", notNull: false },
    { name: "resolved_lon", type: "double precision", notNull: false },
    { name: "resolved_label", type: "text", notNull: false },
    { name: "building_name", type: "text", notNull: false },
    { name: "dorm_name", type: "text", notNull: false },
  ],
  event_route_stops: [
    { name: "resolved_lat", type: "double precision", notNull: false },
    { name: "resolved_lon", type: "double precision", notNull: false },
    { name: "resolved_label", type: "text", notNull: false },
  ],
  aliases: [{ name: "building_name", type: "text", notNull: false }],
};

/** Server tables mirrored into the offline cache. Server-only tables (terms,
 * admin_users, editor_history, …) are intentionally absent. */
const SYNCED_TABLES: PgTable[] = [
  buildingsTable,
  collegesTable,
  classesTable,
  finalExamsTable,
  dormsTable,
  organizationsTable,
  placesTable,
  roomPositionsTable,
  divisionsTable,
  roomsTable,
  eventsTable,
  eventLocationsTable,
  eventRoutesTable,
  eventRouteStopsTable,
  jeepneyRoutesTable,
  jeepneyStopsTable,
  aliasesTable,
];

/** Relax server types for the cache: no enums, timestamps stored as text
 * (sync writes ISO strings and readers expect strings back). */
function localType(sqlType: string): string {
  const base = sqlType.replace(/\[\]$/, "");
  const suffix = sqlType.endsWith("[]") ? "[]" : "";
  if (/^(integer|text|boolean|numeric|double precision|uuid)$/.test(base))
    return base + suffix;
  if (/^varchar\(\d+\)$/.test(base)) return base + suffix;
  // timestamps, date, time, jsonb, and pg enums all degrade to text
  return `text${suffix}`;
}

function renderDefault(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "boolean" || typeof value === "number")
    return String(value);
  if (typeof value === "string") return `'${value.replace(/'/g, "''")}'`;
  // sql`` defaults in synced tables are all defaultNow()
  return "CURRENT_TIMESTAMP";
}

function tableColumns(table: PgTable): { name: string; cols: LocalColumn[] } {
  const config = getTableConfig(table);
  const cols: LocalColumn[] = config.columns.map((col) => ({
    name: col.name,
    type: localType(col.getSQLType()),
    notNull: col.notNull,
    default: renderDefault(col.default),
    primaryKey: col.primary,
  }));
  return {
    name: config.name,
    cols: cols.concat(LOCAL_ONLY[config.name] ?? []),
  };
}

function columnDdl(col: LocalColumn, forAlter: boolean): string {
  const parts = [`"${col.name}"`, col.type];
  if (col.primaryKey && !forAlter) parts.push("PRIMARY KEY");
  if (col.default !== undefined) parts.push(`DEFAULT ${col.default}`);
  // NOT NULL without a default cannot be added to a non-empty table.
  if (
    col.notNull &&
    !col.primaryKey &&
    (!forAlter || col.default !== undefined)
  )
    parts.push("NOT NULL");
  return parts.join(" ");
}

export function buildPgliteInitSql(): string {
  const statements: string[] = [];
  for (const table of SYNCED_TABLES) {
    const { name, cols } = tableColumns(table);
    const body = cols.map((col) => `  ${columnDdl(col, false)}`).join(",\n");
    statements.push(`CREATE TABLE IF NOT EXISTS "${name}" (\n${body}\n);`);
    // Upgrade path for caches created by older app versions.
    for (const col of cols) {
      if (col.primaryKey) continue;
      statements.push(
        `ALTER TABLE "${name}" ADD COLUMN IF NOT EXISTS ${columnDdl(col, true)};`,
      );
    }
  }
  return statements.join("\n");
}

export function buildGeneratedModule(): string {
  return `// AUTO-GENERATED by scripts/generate-pglite-schema.ts — do not edit.
// Regenerate with: bun run generate:pglite-schema
// Source of truth: drizzle/schema.ts (+ LOCAL_ONLY overlay in the generator).

export const PGLITE_INIT_SQL = \`
${buildPgliteInitSql().replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$")}
\`;
`;
}

if (import.meta.main) {
  const outPath = new URL(
    "../src/lib/local/data/pglite-schema.generated.ts",
    import.meta.url,
  );
  await Bun.write(outPath, buildGeneratedModule());
  console.log(`Wrote ${outPath.pathname}`);
}
