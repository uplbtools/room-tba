/**
 * Record `editor_history` rows for a maintenance / bulk data operation.
 *
 * Any script that edits campus data directly should end by handing its
 * operations to this wrapper (or to `recordBulkHistory` in
 * `src/lib/services/bulk-history.ts`), otherwise the edit is invisible in the
 * entity's history and the audit trail lies.
 *
 * Usage:
 *   bun run record:bulk-history -- --ops ops.json            # dry run
 *   bun run record:bulk-history -- --ops ops.json --apply    # write
 *   bun run record:bulk-history -- --ops ops.json --actor import-amis
 *
 * `ops.json` is a JSON array of `BulkOperation` (see bulk-history.ts):
 *   [{ "opKey": "2026-08-04-room-code-fix", "entityType": "room",
 *      "entityId": 412, "action": "bulk-update",
 *      "before": { "roomCode": "CAS  101" }, "after": { "roomCode": "CAS 101" },
 *      "reason": "collapsed a double space introduced by the 2019 import" }]
 *
 * Re-running is safe: rows already carrying the same op key are skipped.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { readFileSync } from "node:fs";
import {
  BULK_ACTOR,
  recordBulkHistory,
  type BulkHistoryResult,
  type BulkOperation,
} from "../src/lib/services/bulk-history";
import { loadEnv } from "./load-env";

/** Open a pool against `DATABASE_URL`; scripts cannot use `@lib/db` (astro:env). */
export function openDb(): { db: NodePgDatabase; close: () => Promise<void> } {
  loadEnv();
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  const pool = new pg.Pool({ connectionString });
  return { db: drizzle(pool), close: () => pool.end() };
}

export function flagValue(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
}

export function readOperations(path: string): BulkOperation[] {
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error(`${path} must contain a JSON array of operations`);
  }
  return parsed as BulkOperation[];
}

/** Shared reporting for this CLI and the one-off backfill. */
export function reportResult(result: BulkHistoryResult): void {
  for (const row of result.pending) {
    console.log(`  + ${row.entityType} #${row.entityId} — ${row.summary}`);
  }
  console.log(
    `\n${result.rows.length} operation(s): ${result.pending.length} new, ${result.skipped} already recorded.`,
  );
  if (result.dryRun) {
    console.log("Dry run. Pass --apply to write.");
  } else {
    console.log(`Wrote ${result.written} history row(s).`);
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const opsPath = flagValue(argv, "--ops");
  if (!opsPath) {
    console.error("--ops <file.json> is required");
    process.exit(1);
  }
  const { db, close } = openDb();
  try {
    const result = await recordBulkHistory(db, readOperations(opsPath), {
      actor: flagValue(argv, "--actor") ?? BULK_ACTOR,
      dryRun: !argv.includes("--apply"),
    });
    reportResult(result);
  } finally {
    await close();
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
