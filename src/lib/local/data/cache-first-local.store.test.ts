import { beforeEach, describe, expect, test, vi } from "vitest";
import type { ClassMapValue } from "@lib/types";

const query = vi.fn();

vi.mock("./pgliteDB", () => ({
  getDB: () => ({
    waitReady: Promise.resolve(),
    query,
  }),
}));

import { getLocalClassesForRoom, getLocalRoomClassCounts } from "./utils";

describe("cache-first local class queries (#415)", () => {
  beforeEach(() => {
    query.mockReset();
  });

  test("getLocalClassesForRoom returns null when classes table is empty", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const result = await getLocalClassesForRoom("ABC-101", 1252);
    expect(result).toBeNull();
    expect(query).toHaveBeenCalledTimes(1);
  });

  test("getLocalClassesForRoom filters by room code and term", async () => {
    const rows: ClassMapValue[] = [
      {
        id: 1,
        courseCode: "CS 11",
        section: "A",
        type: "LEC",
        schedule: [],
        directions: null,
        courseTitle: "Intro",
        termId: 1252,
        roomId: 10,
      },
    ];
    query
      .mockResolvedValueOnce({ rows: [{ "1": 1 }] })
      .mockResolvedValueOnce({ rows });

    const result = await getLocalClassesForRoom("abc-101", 1252);
    expect(result).toEqual(rows);
    expect(query).toHaveBeenCalledTimes(2);
    const roomQuery = query.mock.calls[1]?.[0] as string;
    expect(roomQuery).toContain("upper(r.room_code) = upper($1)");
    expect(roomQuery).toContain("c.term_id = $2");
  });

  test("getLocalRoomClassCounts aggregates by room id", async () => {
    query.mockResolvedValueOnce({ rows: [{ "1": 1 }] }).mockResolvedValueOnce({
      rows: [
        { roomId: 10, count: 3 },
        { roomId: 11, count: 1 },
      ],
    });

    const result = await getLocalRoomClassCounts("building", 5, 1252);
    expect(result).toEqual(
      new Map([
        [10, 3],
        [11, 1],
      ]),
    );
    const countQuery = query.mock.calls[1]?.[0] as string;
    expect(countQuery).toContain("r.building_id = $1");
    expect(countQuery).toContain("GROUP BY c.room_id");
  });
});
