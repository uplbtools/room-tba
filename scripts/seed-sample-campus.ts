/**
 * Seed the fictional sample campus (data/sample-campus/) into DATABASE_URL so
 * a fork or fresh contributor sees the app working before touching real data.
 * Walkthrough: docs/fork-data-guide.md.
 *
 * Usage:
 *   bun run seed:sample              # upsert; safe to rerun
 *   bun run seed:sample -- --dry-run # validate + print plan, no DB access
 *   bun run seed:sample -- --force   # seed even if non-sample buildings exist
 *
 * Mirroring the e2e-reset-db guard style, this refuses to touch a database
 * that already holds non-sample buildings (i.e. a real campus dataset)
 * unless --force is passed.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  aliasesTable,
  buildingsTable,
  classesTable,
  organizationsTable,
  placesTable,
  roomsTable,
  termsTable,
  updateTable,
} from "@drizzle/schema";
import {
  buildRoomLookup,
  classNaturalKey,
  matchRoomId,
  summarizeImportChanges,
} from "@lib/amis/import-classes";
import {
  formatRowIssues,
  normalizeGenericClasses,
  parseGenericClassesCsv,
  validateGenericClassEntries,
} from "@lib/generic-class-import";
import { normalizeAlias } from "@lib/site";
import { loadEnv } from "./load-env";

loadEnv();

const SAMPLE_DIR = join(import.meta.dir, "..", "data", "sample-campus");

type SampleCampus = {
  campus: { name: string };
  terms: {
    id: number;
    label: string;
    schoolYear: string;
    semester: string;
    startsOn: string;
    endsOn: string;
    isDefault: boolean;
    sortOrder: number;
  }[];
  buildings: {
    code: string;
    name: string;
    type: "admin" | "non-admin";
    lat: number;
    lon: number;
    directions: string;
  }[];
  rooms: {
    code: string;
    building: string;
    category: string;
    directions: string;
  }[];
  organizations: {
    name: string;
    category: string;
    building: string;
    description: string;
  }[];
  places: {
    name: string;
    category: string;
    lat: number;
    lon: number;
    description: string;
  }[];
  aliases: { alias: string; targetType: "building" | "room"; target: string }[];
};

function loadSampleCampus(): SampleCampus {
  const campus = JSON.parse(
    readFileSync(join(SAMPLE_DIR, "campus.json"), "utf8"),
  ) as SampleCampus;
  for (const key of [
    "terms",
    "buildings",
    "rooms",
    "organizations",
    "places",
    "aliases",
  ] as const) {
    if (!Array.isArray(campus[key])) {
      throw new Error(`data/sample-campus/campus.json is missing "${key}"`);
    }
  }
  return campus;
}

/** Cross-reference checks so a fork editing the JSON gets named errors. */
function validateSampleCampus(campus: SampleCampus): string[] {
  const errors: string[] = [];
  const buildingCodes = new Set(campus.buildings.map((b) => b.code));
  const roomCodes = new Set(campus.rooms.map((r) => r.code));
  for (const room of campus.rooms) {
    if (!buildingCodes.has(room.building)) {
      errors.push(
        `room "${room.code}" references unknown building "${room.building}"`,
      );
    }
  }
  for (const org of campus.organizations) {
    if (!buildingCodes.has(org.building)) {
      errors.push(
        `organization "${org.name}" references unknown building "${org.building}"`,
      );
    }
  }
  for (const alias of campus.aliases) {
    const pool = alias.targetType === "building" ? buildingCodes : roomCodes;
    if (!pool.has(alias.target)) {
      errors.push(
        `alias "${alias.alias}" references unknown ${alias.targetType} "${alias.target}"`,
      );
    }
  }
  return errors;
}

function loadSampleClasses(termIds: Set<number>) {
  const entries = parseGenericClassesCsv(
    readFileSync(join(SAMPLE_DIR, "classes.csv"), "utf8"),
  );
  const issues = validateGenericClassEntries(entries);
  if (issues.length > 0) {
    throw new Error(
      `data/sample-campus/classes.csv has invalid value(s):\n${formatRowIssues(issues)}`,
    );
  }
  const classes = normalizeGenericClasses(entries);
  for (const row of classes) {
    if (!termIds.has(row.termId)) {
      throw new Error(
        `classes.csv references term_id ${row.termId}, which is not in campus.json`,
      );
    }
  }
  return classes;
}

async function main() {
  const force = process.argv.includes("--force");
  const dryRun = process.argv.includes("--dry-run");

  const campus = loadSampleCampus();
  const refErrors = validateSampleCampus(campus);
  if (refErrors.length > 0) {
    console.error("data/sample-campus/campus.json has broken references:");
    for (const error of refErrors) console.error(`  ${error}`);
    process.exit(1);
  }
  const classes = loadSampleClasses(new Set(campus.terms.map((t) => t.id)));

  if (dryRun) {
    console.log(
      `Dry run OK — would seed "${campus.campus.name}": ` +
        `${campus.terms.length} terms, ${campus.buildings.length} buildings, ` +
        `${campus.rooms.length} rooms, ${campus.organizations.length} organizations, ` +
        `${campus.places.length} places, ${campus.aliases.length} aliases, ` +
        `${classes.length} class sections.`,
    );
    return;
  }

  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    console.error("DATABASE_URL is required (or use --dry-run)");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool);
  const counts: Record<string, { inserted: number; updated: number }> = {};
  const bump = (entity: string, kind: "inserted" | "updated") => {
    counts[entity] ??= { inserted: 0, updated: 0 };
    counts[entity][kind] += 1;
  };

  try {
    // Guard: never overwrite a real campus dataset by accident (mirrors the
    // e2e-reset-db refusal style, but content-based — any DATABASE_URL may be
    // a production DB).
    const sampleBuildingNames = new Set(campus.buildings.map((b) => b.name));
    let existingBuildings: { name: string }[];
    try {
      existingBuildings = await db
        .select({ name: buildingsTable.buildingName })
        .from(buildingsTable);
    } catch (error) {
      console.error(
        "Could not read the buildings table — apply the schema first " +
          `(bun run scripts/apply-migrations.ts). Underlying error: ${(error as Error).message}`,
      );
      process.exit(1);
    }
    const foreign = existingBuildings
      .map((b) => b.name)
      .filter((name) => !sampleBuildingNames.has(name));
    if (foreign.length > 0 && !force) {
      console.error(
        `Refusing to seed: database already has ${foreign.length} non-sample building(s) ` +
          `(e.g. "${foreign[0]}"). This looks like a real campus dataset. ` +
          "Re-run with --force if you really want to add the sample campus to it.",
      );
      process.exit(1);
    }

    await db.transaction(async (tx) => {
      // Terms. terms_single_default allows only one default term, so if a
      // non-sample default already exists (e.g. --force onto real data), keep it.
      const existingDefaults = await tx
        .select({ id: termsTable.id })
        .from(termsTable)
        .where(eq(termsTable.isDefault, true));
      const sampleTermIds = new Set(campus.terms.map((t) => t.id));
      const foreignDefault = existingDefaults.some(
        (t) => !sampleTermIds.has(t.id),
      );
      if (foreignDefault) {
        console.warn(
          "A non-sample default term already exists; seeding sample terms as non-default.",
        );
      }
      const existingTermIds = new Set(
        (
          await tx
            .select({ id: termsTable.id })
            .from(termsTable)
            .where(inArray(termsTable.id, [...sampleTermIds]))
        ).map((t) => t.id),
      );
      for (const term of campus.terms) {
        const values = {
          label: term.label,
          schoolYear: term.schoolYear,
          semester: term.semester,
          startsOn: term.startsOn,
          endsOn: term.endsOn,
          isDefault: term.isDefault && !foreignDefault,
          isActive: true,
          sortOrder: term.sortOrder,
        };
        await tx
          .insert(termsTable)
          .values({ id: term.id, ...values })
          .onConflictDoUpdate({ target: termsTable.id, set: values });
        bump("terms", existingTermIds.has(term.id) ? "updated" : "inserted");
      }

      // Buildings (matched by name — the schema has no natural unique key).
      const buildingRows = await tx
        .select({ id: buildingsTable.id, name: buildingsTable.buildingName })
        .from(buildingsTable);
      const buildingIdByName = new Map(buildingRows.map((b) => [b.name, b.id]));
      const buildingIdByCode = new Map<string, number>();
      for (const building of campus.buildings) {
        const values = {
          buildingName: building.name,
          lat: building.lat,
          lon: building.lon,
          buildingType: building.type,
          directions: building.directions,
        };
        const existingId = buildingIdByName.get(building.name);
        if (existingId != null) {
          await tx
            .update(buildingsTable)
            .set(values)
            .where(eq(buildingsTable.id, existingId));
          buildingIdByCode.set(building.code, existingId);
          bump("buildings", "updated");
        } else {
          const [inserted] = await tx
            .insert(buildingsTable)
            .values(values)
            .returning({ id: buildingsTable.id });
          buildingIdByCode.set(building.code, inserted.id);
          bump("buildings", "inserted");
        }
      }

      // Rooms (matched by room_code).
      const roomRows = await tx
        .select({ id: roomsTable.id, code: roomsTable.roomCode })
        .from(roomsTable);
      const roomIdByCode = new Map(roomRows.map((r) => [r.code, r.id]));
      for (const room of campus.rooms) {
        const values = {
          roomCode: room.code,
          buildingId: buildingIdByCode.get(room.building) ?? null,
          category: room.category,
          directions: room.directions,
        };
        const existingId = roomIdByCode.get(room.code);
        if (existingId != null) {
          await tx
            .update(roomsTable)
            .set(values)
            .where(eq(roomsTable.id, existingId));
          bump("rooms", "updated");
        } else {
          const [inserted] = await tx
            .insert(roomsTable)
            .values(values)
            .returning({ id: roomsTable.id });
          roomIdByCode.set(room.code, inserted.id);
          bump("rooms", "inserted");
        }
      }

      // Organizations and places (matched by name).
      const orgRows = await tx
        .select({ id: organizationsTable.id, name: organizationsTable.name })
        .from(organizationsTable);
      const orgIdByName = new Map(orgRows.map((o) => [o.name, o.id]));
      for (const org of campus.organizations) {
        const values = {
          name: org.name,
          category: org.category,
          buildingId: buildingIdByCode.get(org.building) ?? null,
          description: org.description,
        };
        const existingId = orgIdByName.get(org.name);
        if (existingId != null) {
          await tx
            .update(organizationsTable)
            .set(values)
            .where(eq(organizationsTable.id, existingId));
          bump("organizations", "updated");
        } else {
          await tx.insert(organizationsTable).values(values);
          bump("organizations", "inserted");
        }
      }

      const placeRows = await tx
        .select({ id: placesTable.id, name: placesTable.name })
        .from(placesTable);
      const placeIdByName = new Map(placeRows.map((p) => [p.name, p.id]));
      for (const place of campus.places) {
        const values = {
          name: place.name,
          category: place.category,
          lat: place.lat,
          lon: place.lon,
          description: place.description,
        };
        const existingId = placeIdByName.get(place.name);
        if (existingId != null) {
          await tx
            .update(placesTable)
            .set(values)
            .where(eq(placesTable.id, existingId));
          bump("places", "updated");
        } else {
          await tx.insert(placesTable).values(values);
          bump("places", "inserted");
        }
      }

      // Aliases (unique on normalized alias + target, so rerun is a no-op).
      counts.aliases = { inserted: 0, updated: 0 };
      for (const alias of campus.aliases) {
        const targetId =
          alias.targetType === "building"
            ? buildingIdByCode.get(alias.target)
            : roomIdByCode.get(alias.target);
        if (targetId == null) continue; // validateSampleCampus() already caught this
        const result = await tx
          .insert(aliasesTable)
          .values({
            alias: alias.alias,
            normalizedAlias: normalizeAlias(alias.alias),
            targetType: alias.targetType,
            targetId,
            source: "sample_campus",
            confidence: "verified",
          })
          .onConflictDoNothing();
        counts.aliases.inserted += result.rowCount ?? 0;
      }

      // Classes — same natural-key upsert as the import scripts.
      const roomAliases = campus.aliases
        .filter((alias) => alias.targetType === "room")
        .map((alias) => ({
          alias: alias.alias,
          targetId: roomIdByCode.get(alias.target) ?? -1,
        }));
      const lookup = buildRoomLookup(
        [...roomIdByCode.entries()].map(([code, id]) => ({ id, code })),
        roomAliases,
      );
      const incomingRows = classes.map((row) => {
        let roomId: number | null = null;
        for (const candidate of row.roomCandidates) {
          const match = matchRoomId(lookup, candidate);
          if (match) {
            roomId = match.roomId;
            break;
          }
        }
        return {
          courseCode: row.courseCode,
          section: row.section,
          type: row.type,
          courseTitle: row.courseTitle,
          schedule: row.schedule,
          roomId,
          termId: row.termId,
        };
      });

      const termIds = [...sampleTermIds];
      const existingClasses = await tx
        .select({
          id: classesTable.id,
          courseCode: classesTable.courseCode,
          section: classesTable.section,
          type: classesTable.type,
          courseTitle: classesTable.courseTitle,
          schedule: classesTable.schedule,
          roomId: classesTable.roomId,
          termId: classesTable.termId,
        })
        .from(classesTable)
        .where(inArray(classesTable.termId, termIds));
      const existingByKey = new Map<string, (typeof existingClasses)[number]>();
      for (const row of existingClasses) {
        if (row.termId == null) continue;
        existingByKey.set(
          classNaturalKey({
            termId: row.termId,
            courseCode: row.courseCode ?? "",
            section: row.section,
            type: row.type,
          }),
          row,
        );
      }
      const { summary, inserts, updates } = summarizeImportChanges({
        replaceTerm: false,
        existingKeys: new Set(existingByKey.keys()),
        existingByKey,
        incomingRows,
      });
      for (const { id, row } of updates) {
        await tx.update(classesTable).set(row).where(eq(classesTable.id, id));
      }
      if (inserts.length > 0) {
        await tx.insert(classesTable).values(inserts);
      }
      counts.classes = {
        inserted: summary.inserted,
        updated: summary.updated,
      };
      await tx
        .update(termsTable)
        .set({ classesImportedAt: new Date().toISOString() })
        .where(inArray(termsTable.id, termIds));

      // Refresh sync keys so connected clients re-pull the changed tables.
      for (const tableName of [
        "buildings",
        "rooms",
        "terms",
        "classes",
        "organizations",
        "places",
      ]) {
        await tx
          .insert(updateTable)
          .values({ tableName, syncKey: randomUUID() })
          .onConflictDoUpdate({
            target: updateTable.tableName,
            set: { syncKey: randomUUID() },
          });
      }
    });

    console.log(`Sample campus seeded: ${campus.campus.name}`);
    for (const [entity, count] of Object.entries(counts)) {
      console.log(`  ${entity}: +${count.inserted} ~${count.updated}`);
    }
    console.log(
      "\nNext: point src/campus.config.ts at the sample campus map area, then `bun dev` — see docs/fork-data-guide.md.",
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
