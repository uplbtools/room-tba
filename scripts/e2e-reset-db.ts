/**
 * Reset E2E Supabase database and seed fixtures for integration + Playwright.
 * Refuses to run unless DATABASE_URL host contains the E2E project ref.
 *
 * With `E2E_SCHEMA` set the reset targets that schema instead of `public`
 * (#773): create it, replay the whole migration chain into it, seed, and let
 * `--drop` tear it down. Unset keeps the shared-`public` behavior.
 */
import bcrypt from "bcrypt";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type pg from "pg";
import { connectE2eClient, E2E_SCHEMA_PATTERN, e2eSchema } from "./e2e-schema";
import { loadEnv } from "./load-env";
import { campusTestFixtures } from "../src/campus.config";

loadEnv();

const E2E_PROJECT_REF = "yhzinxlakcewqjaqbbaj";
const DEFAULT_E2E_PASSWORD = "e2e-test-password-change-me";

export const E2E_FIXTURES = {
  buildingName: "E2E Test Hall",
  dormName: "E2E Test Dorm",
  orgName: "E2E Test Office",
  placeName: "E2E Test Cafe",
  roomCode: "E2E-101",
  eventSlug: "e2e-test-event",
  eventTitle: "E2E Test Event",
  termId: 1252,
  users: {
    admin: "e2e-admin",
    editor: "e2e-editor",
    contributor: "e2e-contributor",
    disabled: "e2e-disabled",
  },
  // Reference coordinates come from campus.config.ts so a fork's E2E pins
  // land inside its own campus bounds.
  buildingLat: campusTestFixtures.buildingLat,
  buildingLon: campusTestFixtures.buildingLon,
  dormLat: campusTestFixtures.dormLat,
  dormLon: campusTestFixtures.dormLon,
} as const;

/** Guard the target: E2E project, and an `e2e_*` schema when one is requested. */
function assertE2eDatabase(url: string): string | null {
  if (!url.includes(E2E_PROJECT_REF)) {
    throw new Error(
      `Refusing to reset DB: host must include E2E project ref ${E2E_PROJECT_REF}.`,
    );
  }
  return e2eSchema();
}

/** Idempotent migrations needed before truncate/seed on the shared E2E project. */
const E2E_MIGRATION_FILES = [
  "0017_add_withdrawn_proposal_status.sql",
  "0018_contributions_ledger.sql",
  "0019_add_entity_image_url.sql",
  "0020_add_admin_user_email.sql",
  "0021_account_management.sql",
  "0022_history_summary_index.sql",
  "0023_add_room_category.sql",
  "0024_add_places.sql",
  "0025_add_organizations.sql",
  "0026_add_planner_plans.sql",
  "0027_add_directory_sync_keys.sql",
  "0028_add_org_about_fields.sql",
  "0029_add_college_division_websites.sql",
  "0030_directory_data_fixes.sql",
  "0031_directory_data_fixes_2.sql",
  "0032_add_jeepney_transit.sql",
  "0033_ay_2026_2027_term_dates.sql",
  "0034_historical_term_dates.sql",
  "0035_add_term_classes_imported_at.sql",
  "0036_add_building_cr_facilities.sql",
  "0037_editor_credits_profiles.sql",
  "0038_sponsor_impressions.sql",
  "0039_classes_keyset_index.sql",
  "0040_pre_drizzle_schema_backfill.sql",
  "0041_add_announcements.sql",
  "0042_add_class_acad_org.sql",
  "0043_add_presence.sql",
  "0045_add_proposal_submitter_note.sql",
  "0048_add_flora.sql",
  "0050_dorm_gender_nullable.sql",
] as const;

/**
 * `import.meta.dir` is Bun-only and Playwright specs import `E2E_FIXTURES` from
 * this file under Node, so keep it lazy or every spec dies on import.
 */
function drizzleDir(): string {
  return join(import.meta.dir, "..", "drizzle");
}

/**
 * `update` predates drizzle: 0003 inserts into it, but only 0016 creates it.
 * 0016 is idempotent, so a fresh schema just applies it up front as well.
 */
const LEGACY_BOOTSTRAP = "0016_ensure_update_sync_table.sql";

/**
 * A fresh run schema is empty, so replay the full chain (filename order = apply
 * order, so no list to keep in sync when a migration lands). The shared `public`
 * schema already has 0000–0016, so it only needs the incremental list.
 */
function e2eMigrationFiles(schema: string | null): string[] {
  if (!schema) return [...E2E_MIGRATION_FILES];
  const all = readdirSync(drizzleDir())
    .filter((file) => file.endsWith(".sql"))
    .sort();
  return [LEGACY_BOOTSTRAP, ...all];
}

/**
 * Two drizzle quirks stand between the chain and an empty schema: 0000 is an
 * introspection snapshot whose DDL sits inside a block comment, and a few files
 * hard-qualify our own tables/enums as `"public"."x"`. Both only matter when
 * replaying into a run schema.
 */
function readMigration(file: string, schema: string | null): string {
  const sql = readFileSync(join(drizzleDir(), file), "utf8");
  if (!schema) return sql;
  const uncommented = file.startsWith("0000_")
    ? sql.replaceAll("/*", "").replaceAll("*/", "")
    : sql;
  return uncommented.replaceAll('"public".', `"${schema}".`);
}

async function applyE2eMigrations(
  client: pg.Client,
  files: string[],
  schema: string | null,
) {
  for (const file of files) {
    try {
      await client.query(readMigration(file, schema));
    } catch (error) {
      throw new Error(`Migration ${file} failed: ${(error as Error).message}`, {
        cause: error,
      });
    }
  }
}

const STALE_SCHEMA_MS = 24 * 60 * 60 * 1000;
const E2E_RESET_LOCK = 447265; // serialize `public` resets + the stale sweep

/**
 * Drop run schemas whose job was cancelled or killed before teardown. Postgres
 * does not record schema creation time, so each run stamps its own schema
 * comment with an ISO timestamp.
 *
 * Sweeping is opportunistic, so it takes the reset lock with `try` (#782): a
 * run that loses the race skips the sweep rather than sitting on a pooler
 * connection, and the next reset picks the same schemas up.
 */
async function sweepStaleSchemas(client: pg.Client) {
  const { rows: lock } = await client.query<{ locked: boolean }>(
    "SELECT pg_try_advisory_lock($1) AS locked",
    [E2E_RESET_LOCK],
  );
  if (!lock[0]?.locked) return;
  try {
    const { rows } = await client.query<{
      nspname: string;
      stamp: string | null;
    }>(
      `SELECT nspname, obj_description(oid, 'pg_namespace') AS stamp
         FROM pg_namespace WHERE nspname LIKE 'e2e\\_%'`,
    );
    const cutoff = Date.now() - STALE_SCHEMA_MS;
    for (const { nspname, stamp } of rows) {
      const created = stamp ? Date.parse(stamp) : Number.NaN;
      // ponytail: an unstamped e2e_* schema was made by hand, so leave it alone.
      if (!E2E_SCHEMA_PATTERN.test(nspname)) continue;
      if (!Number.isFinite(created) || created >= cutoff) continue;
      await client.query(`DROP SCHEMA IF EXISTS ${nspname} CASCADE`);
      console.log(`Swept stale E2E schema ${nspname} (stamped ${stamp}).`);
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [E2E_RESET_LOCK]);
  }
}

async function main() {
  const databaseUrl =
    process.env.E2E_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "";
  if (!databaseUrl) {
    throw new Error("E2E_DATABASE_URL or DATABASE_URL is required");
  }
  const schema = assertE2eDatabase(databaseUrl);

  // CI teardown (`--drop`): never touches `public`, so unset E2E_SCHEMA is a no-op.
  if (process.argv.includes("--drop")) {
    if (!schema) {
      console.log("E2E_SCHEMA unset, nothing to drop.");
      return;
    }
    const dropper = await connectE2eClient(databaseUrl);
    try {
      await dropper.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      console.log(`Dropped E2E schema ${schema}.`);
    } finally {
      await dropper.end();
    }
    return;
  }

  const password =
    process.env.E2E_ADMIN_PASSWORD?.trim() || DEFAULT_E2E_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 12);

  const client = await connectE2eClient(databaseUrl);

  try {
    if (schema) {
      // `SET search_path` (done on connect) tolerates a missing schema, so the
      // create can happen here; every statement below then lands in `schema`.
      await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
      await client.query(
        `COMMENT ON SCHEMA ${schema} IS '${new Date().toISOString()}'`,
      );
      await sweepStaleSchemas(client);
    } else {
      // #782: only a `public` reset needs the global lock, because that schema
      // is shared. A run schema belongs to this job alone, and holding the lock
      // across its whole chain replay left every concurrent CI job sitting on a
      // pooler connection waiting its turn, which is the overlap that exhausts
      // pool_size.
      await client.query("SELECT pg_advisory_lock($1)", [E2E_RESET_LOCK]);
    }

    await applyE2eMigrations(client, e2eMigrationFiles(schema), schema);

    await client.query(`
      TRUNCATE TABLE
        announcements,
        sponsor_impressions,
        planner_plans,
        editor_history,
        contributions,
        edit_proposals,
        jeepney_stops,
        jeepney_routes,
        event_route_stops,
        event_routes,
        event_locations,
        events,
        final_exams,
        classes,
        room_positions,
        rooms,
        aliases,
        organizations,
        places,
        buildings,
        dorms,
        divisions,
        colleges,
        admin_users,
        terms,
        update
      RESTART IDENTITY CASCADE
    `);

    const college = await client.query<{ id: number }>(
      `INSERT INTO colleges (college_name, version) VALUES ('E2E College', 1) RETURNING id`,
    );
    const collegeId = college.rows[0]?.id;
    if (!collegeId) throw new Error("Failed to seed college");

    const division = await client.query<{ id: number }>(
      `INSERT INTO divisions (division_name, college_id, version) VALUES ('E2E Division', $1, 1) RETURNING id`,
      [collegeId],
    );
    const divisionId = division.rows[0]?.id;
    if (!divisionId) throw new Error("Failed to seed division");

    const building = await client.query<{ id: number }>(
      `INSERT INTO buildings (building_name, lat, lon, type, directions, version)
       VALUES ($1, $2, $3, 'non-admin', 'E2E seeded building', 1) RETURNING id`,
      [
        E2E_FIXTURES.buildingName,
        E2E_FIXTURES.buildingLat,
        E2E_FIXTURES.buildingLon,
      ],
    );
    const buildingId = building.rows[0]?.id;
    if (!buildingId) throw new Error("Failed to seed building");

    const dorm = await client.query<{ id: number }>(
      `INSERT INTO dorms (dorm_name, lat, lon, gender, version)
       VALUES ($1, $2, $3, 'coed', 1) RETURNING id`,
      [E2E_FIXTURES.dormName, E2E_FIXTURES.dormLat, E2E_FIXTURES.dormLon],
    );
    const dormId = dorm.rows[0]?.id;
    if (!dormId) throw new Error("Failed to seed dorm");

    const room = await client.query<{ id: number }>(
      `INSERT INTO rooms (room_code, directions, building_id, college_id, division_id, version)
       VALUES ($1, 'E2E room directions', $2, $3, $4, 1) RETURNING id`,
      [E2E_FIXTURES.roomCode, buildingId, collegeId, divisionId],
    );
    const roomId = room.rows[0]?.id;
    if (!roomId) throw new Error("Failed to seed room");

    const organization = await client.query<{ id: number }>(
      `INSERT INTO organizations (name, category, building_id, description, version)
       VALUES ($1, 'office', $2, 'E2E seeded office', 1) RETURNING id`,
      [E2E_FIXTURES.orgName, buildingId],
    );
    const orgId = organization.rows[0]?.id;
    if (!orgId) throw new Error("Failed to seed organization");

    const place = await client.query<{ id: number }>(
      `INSERT INTO places (name, category, lat, lon, description, version)
       VALUES ($1, 'food', $2, $3, 'E2E seeded place', 1) RETURNING id`,
      [
        E2E_FIXTURES.placeName,
        E2E_FIXTURES.buildingLat,
        E2E_FIXTURES.buildingLon,
      ],
    );
    const placeId = place.rows[0]?.id;
    if (!placeId) throw new Error("Failed to seed place");

    await client.query(
      `INSERT INTO events (slug, title, description, category, starts_at, ends_at, timezone, recurrence, is_active, include_in_seo, version)
       VALUES ($1, $2, 'E2E event', 'other', NOW() + interval '1 day', NOW() + interval '2 days', 'Asia/Manila', 'none', true, true, 1)`,
      [E2E_FIXTURES.eventSlug, E2E_FIXTURES.eventTitle],
    );

    await client.query(
      `INSERT INTO terms (id, label, school_year, semester, is_default, is_active, sort_order, version)
       VALUES ($1, 'E2E 2nd Sem', '2025-2026', '2', true, true, 0, 1)`,
      [E2E_FIXTURES.termId],
    );

    await client.query(
      `INSERT INTO jeepney_routes (id, name, description, color, fare_regular, fare_discounted)
       VALUES ('e2e-route', 'E2E Route', 'E2E jeepney route', '#dc2626', 13, 11)`,
    );
    await client.query(
      `INSERT INTO jeepney_stops (route_id, name, description, lat, lon, sort_order)
       VALUES ('e2e-route', 'E2E Stop', 'E2E jeepney stop', $1, $2, 1)`,
      [E2E_FIXTURES.buildingLat, E2E_FIXTURES.buildingLon],
    );

    await client.query(
      `INSERT INTO classes (course_code, section, type, schedule, room_id, course_title, term_id, version)
       VALUES ('E2E 101', 'AB', 'LEC', ARRAY['MWF 08:00AM-09:00AM'], $1, 'E2E Course', $2, 1)`,
      [roomId, E2E_FIXTURES.termId],
    );
    // Second class on the same days so a planned day has the two routable
    // stops the day route needs (e2e/smoke/today-route.spec.ts, #839).
    await client.query(
      `INSERT INTO classes (course_code, section, type, schedule, room_id, course_title, term_id, version)
       VALUES ('E2E 102', 'AB', 'LEC', ARRAY['MWF 09:00AM-10:00AM'], $1, 'E2E Course 2', $2, 1)`,
      [roomId, E2E_FIXTURES.termId],
    );

    // Room TBA section (#846): no room, uncurated acad_org, so the probable-
    // location hint resolves via course history (section AB above meets in
    // the seeded building).
    await client.query(
      `INSERT INTO classes (course_code, section, type, schedule, room_id, course_title, term_id, acad_group, acad_org, version)
       VALUES ('E2E 101', 'C', 'LEC', ARRAY['TTh 10:00AM-11:00AM'], NULL, 'E2E Course', $1, 'E2E', 'LBE2E', 1)`,
      [E2E_FIXTURES.termId],
    );

    await client.query(
      `INSERT INTO final_exams (term_id, course_code, section, course_title, room_id, exam_date, starts_at, ends_at, source, version)
       VALUES ($1, 'E2E 101', 'AB', 'E2E Course', $2, '2026-05-15', '08:00', '11:00', 'e2e', 1)`,
      [E2E_FIXTURES.termId, roomId],
    );

    for (const [username, role, active] of [
      [E2E_FIXTURES.users.admin, "admin", true],
      [E2E_FIXTURES.users.editor, "editor", true],
      [E2E_FIXTURES.users.contributor, "contributor", true],
      [E2E_FIXTURES.users.disabled, "editor", false],
    ] as const) {
      await client.query(
        `INSERT INTO admin_users (username, display_name, password_hash, role, is_active)
         VALUES ($1, $1, $2, $3, $4)`,
        [username, passwordHash, role, active],
      );
    }

    for (const tableName of [
      "buildings",
      "dorms",
      "rooms",
      "colleges",
      "divisions",
      "events",
      "classes",
      "terms",
      "organizations",
      "places",
      "jeepney_routes",
      "announcements",
    ]) {
      await client.query(
        `INSERT INTO update (table_name, sync_key) VALUES ($1, gen_random_uuid())
         ON CONFLICT (table_name) DO UPDATE SET sync_key = EXCLUDED.sync_key`,
        [tableName],
      );
    }

    console.log(
      JSON.stringify({
        ok: true,
        schema: schema ?? "public",
        buildingId,
        dormId,
        roomId,
        collegeId,
        divisionId,
        orgId,
        placeId,
      }),
    );
  } finally {
    try {
      if (!schema) {
        await client.query("SELECT pg_advisory_unlock($1)", [E2E_RESET_LOCK]);
      }
    } catch {
      // connection may already be closed after a failed reset
    }
    await client.end();
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
