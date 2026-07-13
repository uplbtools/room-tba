import { beforeEach, describe, expect, test, vi } from "vitest";

const { getJSONFetch } = vi.hoisted(() => ({
  getJSONFetch: vi.fn(),
}));

vi.mock("../local/data/utils.js", () => ({
  getJSONFetch,
  getBuildingIdsWithClasses: vi.fn(),
}));

import { RoomClassesStore } from "./data-stores.svelte.js";

describe("RoomClassesStore", () => {
  beforeEach(() => {
    getJSONFetch.mockReset();
    getJSONFetch.mockResolvedValue([]);
  });

  test("waits for a term and always scopes room requests to it", async () => {
    const store = new RoomClassesStore();

    await store.load("NL", null);
    expect(getJSONFetch).not.toHaveBeenCalled();

    await store.load("NL", 1252);
    expect(getJSONFetch).toHaveBeenCalledWith(
      "/api/classes?room_code=NL&term_id=1252",
    );
  });
});
