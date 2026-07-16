/**
 * Reset E2E Supabase database and seed fixtures for integration + Playwright.
 * Refuses to run unless DATABASE_URL host contains the E2E project ref.
 */
import bcrypt from "bcrypt";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { loadEnv } from "./load-env";

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
  buildingLat: 14.1655,
  buildingLon: 121.2412,
  dormLat: 14.166,
  dormLon: 121.242,
} as const;

function assertE2eDatabase(url: string) {
  if (!url.includes(E2E_PROJECT_REF)) {
    throw new Error(
      `Refusing to reset DB: host must include E2E project ref ${E2E_PROJECT_REF}.`,
    );
  }
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
] as const;

async function applyE2eMigrations(client: pg.Client) {
  for (const file of E2E_MIGRATION_FILES) {
    const sql = readFileSync(
      join(import.meta.dir, "..", "drizzle", file),
      "utf8",
    );
    await client.query(sql);
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
  assertE2eDatabase(databaseUrl);

  const password =
    process.env.E2E_ADMIN_PASSWORD?.trim() || DEFAULT_E2E_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 12);

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  const E2E_RESET_LOCK = 447265; // serialize concurrent CI resets on shared E2E DB

  try {
    await client.query("SELECT pg_advisory_lock($1)", [E2E_RESET_LOCK]);

    await applyE2eMigrations(client);

    await client.query(`
      TRUNCATE TABLE
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
       VALUES ('e2e-route', 'E2E Stop', 'E2E jeepney stop', 14.1655, 121.2412, 1)`,
    );

    await client.query(
      `INSERT INTO classes (course_code, section, type, schedule, room_id, course_title, term_id, version)
       VALUES ('E2E 101', 'AB', 'LEC', ARRAY['MWF 08:00AM-09:00AM'], $1, 'E2E Course', $2, 1)`,
      [roomId, E2E_FIXTURES.termId],
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
      await client.query("SELECT pg_advisory_unlock($1)", [E2E_RESET_LOCK]);
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
