import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

// Record which sync functions the offline directory download invokes.
const calls: string[] = [];

const emptyLoad = () => Promise.resolve({ rows: [], source: "local" as const });
const oneRowLoad = () =>
  Promise.resolve({ rows: [{ id: 1 }], source: "remote" as const });
const syncSpy = (name: string) => () => {
  calls.push(name);
  return Promise.resolve();
};

mock.module("./utils", () => ({
  getBuildings: emptyLoad,
  getColleges: emptyLoad,
  getDivisions: emptyLoad,
  getDorms: emptyLoad,
  // Non-empty so the org/place sync branches actually run.
  getOrganizations: oneRowLoad,
  getPlaces: oneRowLoad,
  getBuildingRooms: emptyLoad,
  getCollegeRooms: emptyLoad,
  getDivisionRooms: emptyLoad,
}));

mock.module("./sync", () => ({
  localTableSyncCheck: () => Promise.resolve({ newKey: "k", localKey: null }),
  checkLocalBuildingRoom: () => Promise.resolve(false),
  checkLocalCollegeRoom: () => Promise.resolve(false),
  checkLocalDivisionRoom: () => Promise.resolve(false),
  syncAliasCache: syncSpy("aliases"),
  syncBuildingRooms: syncSpy("buildingRooms"),
  syncBuildings: syncSpy("buildings"),
  syncCollegeRooms: syncSpy("collegeRooms"),
  syncColleges: syncSpy("colleges"),
  syncDivisionRooms: syncSpy("divisionRooms"),
  syncDivisions: syncSpy("divisions"),
  syncDorms: syncSpy("dorms"),
  syncOrganizations: syncSpy("organizations"),
  syncPlaces: syncSpy("places"),
}));

const { syncCampusDirectoryForOffline } = await import(
  "./campus-directory-sync"
);

describe("syncCampusDirectoryForOffline", () => {
  beforeEach(() => {
    calls.length = 0;
    globalThis.localStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    } as unknown as Storage;
  });

  afterEach(() => {
    calls.length = 0;
  });

  test("downloads organizations and places for offline use", async () => {
    const result = await syncCampusDirectoryForOffline();
    expect(result.ok).toBe(true);
    // The whole point of #14: orgs/places must be part of the offline directory.
    expect(calls).toContain("organizations");
    expect(calls).toContain("places");
  });
});
