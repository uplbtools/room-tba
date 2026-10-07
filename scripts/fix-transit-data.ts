/**
 * Apply the 2026-10-06 transit data corrections (see
 * scripts/lib/transit-fixes-core.ts for what and why) to the database, with
 * an editor_history row per change (docs/bulk-data-history.md) and a sync-key
 * bump so clients pick the new stops up.
 *
 * Dry run by default: prints every change and writes nothing.
 *
 *   DATABASE_URL=... bun run scripts/fix-transit-data.ts            # plan
 *   DATABASE_URL=... bun run scripts/fix-transit-data.ts --apply    # write
 *
 * Idempotent: a second run plans nothing.
 */

import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import {
  jeepneyRoutesTable,
  jeepneyStopsTable,
  updateTable,
} from "../drizzle/schema";
import { JEEPNEY_ROUTES } from "../src/constants/jeepney-routes";
import { recordBulkHistory } from "../src/lib/services/bulk-history";
import { openDb } from "./record-bulk-history";
import { planTransitFixes, TRANSIT_FIX_OP_KEY } from "./lib/transit-fixes-core";

const apply = process.argv.includes("--apply");
const { db, close } = openDb();

try {
  const [routes, stops] = await Promise.all([
    db
      .select({
        id: jeepneyRoutesTable.id,
        name: jeepneyRoutesTable.name,
        description: jeepneyRoutesTable.description,
        fareRegular: jeepneyRoutesTable.fareRegular,
        fareDiscounted: jeepneyRoutesTable.fareDiscounted,
        version: jeepneyRoutesTable.version,
      })
      .from(jeepneyRoutesTable),
    db
      .select({
        id: jeepneyStopsTable.id,
        routeId: jeepneyStopsTable.routeId,
        name: jeepneyStopsTable.name,
        description: jeepneyStopsTable.description,
        lat: jeepneyStopsTable.lat,
        lon: jeepneyStopsTable.lon,
        version: jeepneyStopsTable.version,
      })
      .from(jeepneyStopsTable),
  ]);

  const fixes = planTransitFixes(
    routes,
    stops,
    new Set(JEEPNEY_ROUTES.map((route) => route.id)),
  );

  for (const fix of fixes) {
    console.log(
      `${apply ? "apply" : "plan "} ${fix.table} ${fix.label}\n  before ${JSON.stringify(fix.before)}\n  after  ${JSON.stringify(fix.after)}`,
    );
  }
  console.log(
    `${fixes.length} change(s)${apply ? "" : " — dry run, pass --apply to write"}`,
  );

  if (apply && fixes.length > 0) {
    await db.transaction(async (tx) => {
      for (const fix of fixes) {
        if (fix.table === "jeepney_stops") {
          await tx
            .update(jeepneyStopsTable)
            .set({
              ...fix.after,
              version: sql`${jeepneyStopsTable.version} + 1`,
              updatedAt: sql`now()`,
            })
            .where(eq(jeepneyStopsTable.id, fix.id));
        } else {
          await tx
            .update(jeepneyRoutesTable)
            .set({
              ...fix.after,
              version: sql`${jeepneyRoutesTable.version} + 1`,
              updatedAt: sql`now()`,
            })
            .where(eq(jeepneyRoutesTable.id, fix.id));
        }
      }
      await tx
        .update(updateTable)
        .set({ syncKey: randomUUID() })
        .where(eq(updateTable.tableName, "jeepney_routes"));
    });

    const history = await recordBulkHistory(
      db,
      fixes.map((fix) => ({
        // History dedupes on (type, id, opKey); route rows all use id 0, so
        // each route needs its own key or the second would be skipped.
        opKey:
          typeof fix.id === "number"
            ? TRANSIT_FIX_OP_KEY
            : `${TRANSIT_FIX_OP_KEY}-${fix.id}`,
        entityType:
          fix.table === "jeepney_stops" ? "jeepney_stop" : "jeepney_route",
        // Route ids are text; their history rows span by id in before/after.
        entityId: typeof fix.id === "number" ? fix.id : 0,
        before: { id: fix.id, ...fix.before },
        after: { id: fix.id, ...fix.after },
        reason: `transit audit: ${fix.label}`,
        versionBefore: fix.version,
        versionAfter: fix.version + 1,
      })),
      { dryRun: false },
    );
    console.log(
      `history: ${history.written} written, ${history.skipped} already recorded`,
    );
  }
} finally {
  await close();
}
