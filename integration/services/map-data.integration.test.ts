import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import pg from "pg";
import { integrationDatabaseUrl, skipWithoutE2eDb } from "../helpers/env";

const describeIntegration = skipWithoutE2eDb() ? describe.skip : describe;

describeIntegration("room class queries", () => {
  let client: pg.Client;
  let courseCode: string;
  let roomIds: number[] = [];
  let termId: number;

  beforeAll(async () => {
    client = new pg.Client({ connectionString: integrationDatabaseUrl()! });
    await client.connect();
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
