import { beforeEach, describe, expect, test, vi } from "vitest";
import type { ClassMapValue } from "@lib/types";

const { getJSONFetch, getLocalClassesForRoom } = vi.hoisted(() => ({
  getJSONFetch: vi.fn(),
  getLocalClassesForRoom: vi.fn(),
}));

vi.mock("../local/data/utils.js", () => ({
  getJSONFetch,
  getBuildingIdsWithClasses: vi.fn(),
  getLocalClassesForRoom,
}));

import { RoomClassesStore } from "./data-stores.svelte.js";

const sample = (id: number): ClassMapValue =>
  ({
    id,
    courseCode: "CMSC 128",
    section: "AB",
    type: "LEC",
    schedule: ["MW 07:00AM-08:00AM"],
    roomCode: "NL",
    directions: null,
    courseTitle: "Software Engineering",
    roomId: 1,
    termId: 1252,
  }) as ClassMapValue;

describe("RoomClassesStore", () => {
  beforeEach(() => {
    getJSONFetch.mockReset();
    getLocalClassesForRoom.mockReset();
    getJSONFetch.mockResolvedValue([]);
    getLocalClassesForRoom.mockResolvedValue(null);
  });

  test("waits for a term and always scopes room requests to it", async () => {
    const store = new RoomClassesStore();

    await store.load("NL", null);
    expect(getJSONFetch).not.toHaveBeenCalled();
    expect(getLocalClassesForRoom).not.toHaveBeenCalled();

    await store.load("NL", 1252);
    expect(getLocalClassesForRoom).toHaveBeenCalledWith("NL", 1252);
    expect(getJSONFetch).toHaveBeenCalledWith(
      "/api/classes?room_code=NL&term_id=1252",
    );
  });

  test("paints PGlite rows immediately then refreshes from API (#415)", async () => {
    const localRows = [sample(1)];
    const apiRows = [sample(1), sample(2)];
    getLocalClassesForRoom.mockResolvedValueOnce(localRows);
    getJSONFetch.mockResolvedValueOnce(apiRows);

    const store = new RoomClassesStore();
    await store.load("NL", 1252);

    expect(store.classes).toEqual(localRows);
    expect(store.loading).toBe(false);

    await vi.waitFor(() => {
      expect(store.classes).toEqual(apiRows);
    });
    expect(getJSONFetch).toHaveBeenCalledWith(
      "/api/classes?room_code=NL&term_id=1252",
    );
  });
});
