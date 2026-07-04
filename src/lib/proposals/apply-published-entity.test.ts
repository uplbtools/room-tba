import { describe, expect, test } from "bun:test";
import {
  applyPublishedEntity,
  syncTablesForEntityType,
} from "@lib/proposals/apply-published-entity";
import type { AppActions } from "@lib/context";

function mockActions() {
  const calls: string[] = [];
  const actions: AppActions = {
    replaceEvent: () => calls.push("event"),
    removeEvent: () => {},
    upsertBuilding: () => calls.push("building"),
    upsertDorm: () => {},
    upsertCollege: () => {},
    upsertDivision: () => {},
  };
  return { actions, calls };
}

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

  test("maps entity types to sync tables", () => {
    expect(syncTablesForEntityType("create_building")).toEqual(["buildings"]);
    expect(syncTablesForEntityType("create_room")).toEqual([
      "rooms",
      "buildings",
    ]);
  });
});
