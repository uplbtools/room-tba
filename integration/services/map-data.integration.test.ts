import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { connectE2eClient, type E2eClient } from "../../scripts/e2e-schema";
import { integrationDatabaseUrl, skipWithoutE2eDb } from "../helpers/env";

const describeIntegration = skipWithoutE2eDb() ? describe.skip : describe;

describeIntegration("building class schedules", () => {
  let client: E2eClient;
  let buildingId: number;
  let otherBuildingId: number;
  let roomIds: number[] = [];
  let termId: number;
  const tag = `SC${Date.now()}`.slice(0, 12);

  beforeAll(async () => {
    client = await connectE2eClient(integrationDatabaseUrl()!);
    const terms = await client.query<{ id: number }>(
      "SELECT id FROM terms ORDER BY id DESC LIMIT 1",
    );
    termId = terms.rows[0]!.id;

    const buildings = await client.query<{ id: number }>(
      "INSERT INTO buildings (building_name, lat, lon, directions) VALUES ($1, 14.16, 121.24, ''), ($2, 14.17, 121.25, '') RETURNING id",
      [`${tag} A`, `${tag} B`],
    );
    buildingId = buildings.rows[0]!.id;
    otherBuildingId = buildings.rows[1]!.id;

    const rooms = await client.query<{ id: number }>(
      "INSERT INTO rooms (room_code, building_id) VALUES ($1, $3), ($2, $3), ($4, $5) RETURNING id",
      [`${tag}-1`, `${tag}-2`, buildingId, `${tag}-3`, otherBuildingId],
    );
    roomIds = rooms.rows.map((room) => room.id);

    await client.query(
      `INSERT INTO classes
        (course_code, section, type, schedule, room_id, course_title, term_id)
       VALUES
        ($1, 'A', 'LEC', ARRAY['WF 07:00AM-08:30AM'], $2, 'Schedule test', $5),
        ($1, 'B', 'LEC', ARRAY['TTh 01:00PM-02:30PM', 'F 08:00AM-09:00AM'], $3, 'Schedule test', $5),
        ($1, 'C', 'LEC', ARRAY['MWF 09:00AM-10:00AM'], $4, 'Schedule test', $5)`,
      [tag, roomIds[0], roomIds[1], roomIds[2], termId],
    );
  });

  afterAll(async () => {
    if (!client) return;
    await client.query("DELETE FROM classes WHERE course_code = $1", [tag]);
    await client.query("DELETE FROM rooms WHERE id = ANY($1::int[])", [
      roomIds,
    ]);
    await client.query("DELETE FROM buildings WHERE id = ANY($1::int[])", [
      [buildingId, otherBuildingId],
    ]);
    await client.end();
  });

  test("returns the schedules of one building's rooms only", async () => {
    const { getBuildingClassSchedules } = await import(
      "@lib/services/map-data-service"
    );
    const rows = await getBuildingClassSchedules(buildingId, termId);

    expect(rows).toHaveLength(2);
    expect(rows.flat().sort()).toEqual(
      ["F 08:00AM-09:00AM", "TTh 01:00PM-02:30PM", "WF 07:00AM-08:30AM"].sort(),
    );
  });

  test("another term has none", async () => {
    const { getBuildingClassSchedules } = await import(
      "@lib/services/map-data-service"
    );
    expect(await getBuildingClassSchedules(buildingId, -1)).toEqual([]);
  });
});

describeIntegration("room class queries", () => {
  let client: E2eClient;
  let courseCode: string;
  let roomIds: number[] = [];
  let termId: number;

  beforeAll(async () => {
    client = await connectE2eClient(integrationDatabaseUrl()!);
    courseCode = `ROOMTEST${Date.now()}`.slice(0, 16);

    const terms = await client.query<{ id: number }>(
      "SELECT id FROM terms ORDER BY id DESC LIMIT 1",
    );
    termId = terms.rows[0]!.id;

    const rooms = await client.query<{ id: number }>(
      "INSERT INTO rooms (room_code) VALUES ($1), ($2) RETURNING id",
      [`${courseCode}-A`, `${courseCode}-B`],
    );
    roomIds = rooms.rows.map((room) => room.id);

    await client.query(
      `INSERT INTO classes
        (course_code, section, type, schedule, room_id, course_title, term_id)
       VALUES
        ($1, 'A', 'LEC', ARRAY['WF 07:00AM-08:30AM'], $2, 'Room query test', $4),
        ($1, 'A', 'LAB', ARRAY['T 01:00PM-04:00PM'], $3, 'Room query test', $4)`,
      [courseCode, roomIds[0], roomIds[1], termId],
    );
  });

  afterAll(async () => {
    if (!client) return;
    await client.query("DELETE FROM classes WHERE course_code = $1", [
      courseCode,
    ]);
    await client.query("DELETE FROM rooms WHERE id = ANY($1::int[])", [
      roomIds,
    ]);
    await client.end();
  });

  test("returns only classes assigned to the requested room", async () => {
    const { getClassesForRoom } = await import(
      "@lib/services/map-data-service"
    );
    const rows = await getClassesForRoom(`${courseCode}-A`, termId);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.type).toBe("LEC");
    expect(rows[0]?.roomCode).toBe(`${courseCode}-A`);
  });
});

describeIntegration("queryClasses cursor pagination (#412)", () => {
  let client: E2eClient;
  let courseCode: string;
  let termId: number;
  const sections = ["A", "B", "C", "D", "E"];

  beforeAll(async () => {
    client = await connectE2eClient(integrationDatabaseUrl()!);
    courseCode = `CURTEST${Date.now()}`.slice(0, 16);

    const terms = await client.query<{ id: number }>(
      "SELECT id FROM terms ORDER BY id DESC LIMIT 1",
    );
    termId = terms.rows[0]!.id;

    for (const section of sections) {
      await client.query(
        `INSERT INTO classes
          (course_code, section, type, schedule, course_title, term_id)
         VALUES ($1, $2, 'LEC', ARRAY['M 08:00AM-09:00AM'], 'Cursor test', $3)`,
        [courseCode, section, termId],
      );
    }
  });

  afterAll(async () => {
    if (!client) return;
    await client.query("DELETE FROM classes WHERE course_code = $1", [
      courseCode,
    ]);
    await client.end();
  });

  test("walks every row exactly once and stays stable under inserts", async () => {
    const { queryClasses } = await import("@lib/services/map-data-service");
    const { decodeClassCursor } = await import("@lib/api/class-cursor");

    const first = await queryClasses({
      termId,
      courseCodePrefix: courseCode,
      limit: 2,
    });
    expect(first.rows.map((r) => r.section)).toEqual(["A", "B"]);
    expect(first.hasMore).toBe(true);
    expect(first.nextCursor).not.toBeNull();

    // A row inserted before the cursor position must not shift later pages
    // (the offset-pagination duplicate/skip bug this replaces).
    await client.query(
      `INSERT INTO classes
        (course_code, section, type, schedule, course_title, term_id)
       VALUES ($1, 'AA', 'LEC', ARRAY['T 08:00AM-09:00AM'], 'Cursor test', $2)`,
      [courseCode, termId],
    );

    const second = await queryClasses({
      termId,
      courseCodePrefix: courseCode,
      limit: 2,
      cursor: decodeClassCursor(first.nextCursor!) ?? undefined,
    });
    expect(second.rows.map((r) => r.section)).toEqual(["C", "D"]);
    expect(second.hasMore).toBe(true);

    const third = await queryClasses({
      termId,
      courseCodePrefix: courseCode,
      limit: 2,
      cursor: decodeClassCursor(second.nextCursor!) ?? undefined,
    });
    expect(third.rows.map((r) => r.section)).toEqual(["E"]);
    expect(third.hasMore).toBe(false);
    expect(third.nextCursor).toBeNull();
  });
});
