import { describe, expect, test } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import {
  buildGeneratedModule,
  buildPgliteInitSql,
} from "../../../../scripts/generate-pglite-schema";
import { PGLITE_INIT_SQL } from "./pglite-schema.generated";

describe("pglite offline schema", () => {
  test("generated file is up to date with drizzle/schema.ts", async () => {
    const committed = await Bun.file(
      new URL("./pglite-schema.generated.ts", import.meta.url),
    ).text();
    expect(committed).toBe(buildGeneratedModule());
  });

  test("init SQL runs on a fresh PGlite and is idempotent", async () => {
    const db = new PGlite();
    await db.exec(PGLITE_INIT_SQL);
    // second run = the upgrade path on an existing cache
    await db.exec(PGLITE_INIT_SQL);
    const { rows } = await db.query<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM rooms",
    );
    expect(rows[0]?.count).toBe(0);
    await db.close();
  });

  test("covers every column sync.ts writes", () => {
    // Spot-check the columns that drifted historically.
    for (const fragment of [
      '"rooms_fetched"',
      '"classes_fetched"',
      '"occurrence_starts_at"',
      '"resolved_label"',
      '"building_name"',
      '"image_url"',
      '"website_link"',
      '"classes_imported_at"', // must NOT be present (terms is server-only)
    ]) {
      const present = buildPgliteInitSql().includes(fragment);
      expect(present).toBe(fragment !== '"classes_imported_at"');
    }
  });
});
