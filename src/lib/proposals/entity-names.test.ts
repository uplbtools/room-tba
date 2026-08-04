import { describe, expect, test } from "bun:test";
import type { AppContextData } from "@lib/context";
import { appEntityNameResolver } from "./entity-names";

const loaded = {
  loaded: true,
  buildings: [{ id: 3, buildingName: "Physical Sciences" }],
  colleges: [{ id: 5, collegeName: "CAS" }],
  divisions: [{ id: 8, divisionName: "Physical Sciences Division" }],
  dorms: [],
  events: [],
  organizations: [],
  places: [],
  totalRooms: 0,
  directionCount: 0,
} as unknown as AppContextData;

describe("appEntityNameResolver", () => {
  test("resolves the foreign keys that appear in proposals", () => {
    const resolve = appEntityNameResolver(loaded);
    expect(resolve("buildingId", 3)).toBe("Physical Sciences");
    expect(resolve("collegeId", 5)).toBe("CAS");
    expect(resolve("divisionId", 8)).toBe("Physical Sciences Division");
  });

  test("returns null for unknown ids and unhandled fields", () => {
    const resolve = appEntityNameResolver(loaded);
    expect(resolve("buildingId", 999)).toBeNull();
    expect(resolve("roomId", 3)).toBeNull();
  });

  test("returns null for everything before app data loads", () => {
    const resolve = appEntityNameResolver({
      loaded: false,
    } as unknown as AppContextData);
    expect(resolve("buildingId", 3)).toBeNull();
  });
});
