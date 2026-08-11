/**
 * Apply the unambiguous organization → building links from #891.
 *
 * Each pair is both name- and proximity-verified by `audit:campus-data`.
 * Dry run by default; pass --apply to make the change and record its history.
 */

import { eq, inArray } from "drizzle-orm";
import { organizationsTable } from "@drizzle/schema";
import {
  recordBulkHistory,
  type BulkOperation,
} from "../src/lib/services/bulk-history";
import { loadEnv } from "./load-env";
import { openDb } from "./record-bulk-history";

const OP_KEY = "2026-08-11-campus-audit-building-links";

const LINKS = [
  [19, 23], // ICOPED → ICOPED Building
  [46, 55], // OSA → Student Union Building
  [47, 55], // SDT → Student Union Building
  [62, 55], // UPLB Perspective → Student Union Building
  [63, 9], // UPLB DevComSoc → CDC Building
  [15, 26], // IFST → IFST Building
  [14, 35], // Institute of Physics → Physical Sciences Building
  [21, 40], // Social Forestry → Social Forestry and Forestry Governance
  [20, 28], // IRNR → IRNR Building
  [61, 55], // UPLB USC → Student Union Building
  [18, 27], // IHNF → IHNF Building
  [27, 34], // PHTRC → PHTRC Building
  [16, 42], // IAS → Fronda Hall
  [12, 31], // IMSP → New Math Building
  [203, 35], // UPLB MASS → Physical Sciences Building
  [37, 38], // OC → Main Library
  [38, 38], // OVCAA → Main Library
  [39, 38], // OVCA → Main Library
  [40, 38], // OVCCA → Main Library
  [42, 38], // OVCRE → Main Library
  [41, 38], // OVCPD → Main Library
  [31, 47], // Philippine Carabao Center → Animal Husbandry Building
] as const;

const targets = new Map<number, number>(LINKS);
const apply = process.argv.includes("--apply");
const production = process.argv.includes("--prod");

async function main(): Promise<void> {
  if (!production) {
    throw new Error(
      "Pass --prod: this plan is verified against production IDs.",
    );
  }
  loadEnv();
  if (!process.env.PROD_DATABASE_URL) {
    throw new Error("PROD_DATABASE_URL is required with --prod.");
  }
  process.env.DATABASE_URL = process.env.PROD_DATABASE_URL;
  const { db, close } = openDb();
  try {
    const rows = await db
      .select({
        id: organizationsTable.id,
        name: organizationsTable.name,
        buildingId: organizationsTable.buildingId,
      })
      .from(organizationsTable)
      .where(inArray(organizationsTable.id, [...targets.keys()]));
    if (rows.length !== LINKS.length) {
      throw new Error(
        `Expected ${LINKS.length} organizations, found ${rows.length}; refusing to apply an incomplete plan.`,
      );
    }

    const changes = rows.flatMap((row) => {
      const buildingId = targets.get(row.id)!;
      if (row.buildingId === null) return [{ ...row, buildingId }];
      if (row.buildingId !== buildingId) {
        throw new Error(
          `${row.name} (#${row.id}) now points to building #${row.buildingId}, not #${buildingId}; re-audit before changing it.`,
        );
      }
      return [];
    });

    console.log(`Campus audit links: ${changes.length} to apply.`);
    for (const change of changes) {
      console.log(
        `  ${change.name} (#${change.id}) → building #${change.buildingId}`,
      );
    }
    if (!apply) {
      console.log("\nDry run. Pass --apply to write.");
      return;
    }

    const operations: BulkOperation[] = changes.map((change) => ({
      opKey: OP_KEY,
      entityType: "organization",
      entityId: change.id,
      before: { buildingId: null },
      after: { buildingId: change.buildingId },
      reason: "Linked to the co-located building from the campus data audit.",
    }));
    await db.transaction(async (tx) => {
      for (const change of changes) {
        await tx
          .update(organizationsTable)
          .set({ buildingId: change.buildingId })
          .where(eq(organizationsTable.id, change.id));
      }
      await recordBulkHistory(tx as never, operations, { dryRun: false });
    });
    console.log(
      `\nApplied ${changes.length} organization links with audit history.`,
    );
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
