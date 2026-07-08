import { describe, expect, test } from "bun:test";
import {
  applyPublishedEntity,
  syncTablesForEntityType,
} from "@lib/proposals/apply-published-entity";
import type { AppActions, AppContextData } from "@lib/context";

function mockActions() {
  const calls: string[] = [];
  let lastBuilding: unknown;
  const actions: AppActions = {
    replaceEvent: () => calls.push("event"),
    removeEvent: () => {},
    upsertBuilding: (row) => {
      calls.push("building");
      lastBuilding = row;
    },
    upsertDorm: () => {},
    upsertCollege: () => {},
    upsertDivision: () => {},
    upsertOrganization: () => {},
    upsertPlace: () => {},
  };
  return {
    actions,
    calls,
    getLastBuilding: () => lastBuilding,
  };
}

const loadedData = (): AppContextData => ({
  loaded: true,
  buildings: [
    {
      id: 1,
      buildingName: "Old Hall",
      lat: 14.1,
      lon: 121.1,
      buildingType: "non-admin",
      directions: "Old directions",
      version: 1,
      updatedAt: "2026-01-01",
      osmLink: null,
    },
  ],
  colleges: [],
  divisions: [],
  dorms: [],
  events: [],
  organizations: [],
  places: [],
  totalRooms: 1,
  directionCount: 1,
});

describe("applyPublishedEntity", () => {
  test("upserts building on building approve", () => {
    const { actions, calls } = mockActions();
    const ok = applyPublishedEntity(actions, "building", {
      id: 1,
      buildingName: "Gonzaga",
    });
    expect(ok).toBe(true);
    expect(calls).toEqual(["building"]);
  });

  test("merges published patch into existing building row", () => {
    const { actions, getLastBuilding } = mockActions();
    applyPublishedEntity(
      actions,
      "building",
      { id: 1, directions: "New directions", version: 2 },
      loadedData,
    );
    expect(getLastBuilding()).toEqual({
      id: 1,
      buildingName: "Old Hall",
      lat: 14.1,
      lon: 121.1,
      buildingType: "non-admin",
      directions: "New directions",
      version: 2,
      updatedAt: "2026-01-01",
      osmLink: null,
    });
  });

  test("maps entity types to sync tables", () => {
    expect(syncTablesForEntityType("create_building")).toEqual(["buildings"]);
    expect(syncTablesForEntityType("create_room")).toEqual([
      "rooms",
      "buildings",
    ]);
  });
});
