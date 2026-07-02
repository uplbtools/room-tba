import type { AppContextData } from "@lib/context";

export function loadedAppContext(
  overrides: Partial<Extract<AppContextData, { loaded: true }>> = {},
): Extract<AppContextData, { loaded: true }> {
  return {
    loaded: true,
    buildings: overrides.buildings ?? [
      {
        id: 1,
        buildingName: "Class Hall",
        lat: 14.165,
        lon: 121.241,
        buildingType: "class-building",
        directions: "",
        version: 1,
        updatedAt: new Date(),
        osmLink: null,
      },
    ],
    colleges: overrides.colleges ?? [],
    divisions: overrides.divisions ?? [],
    dorms: overrides.dorms ?? [
      {
        id: 1,
        dormName: "UP Dorm",
        lat: 14.166,
        lon: 121.242,
        gender: "coed",
        version: 1,
        updatedAt: new Date(),
        isUpManaged: true,
      },
    ],
    events: overrides.events ?? [],
    totalRooms: overrides.totalRooms ?? 1,
    directionCount: overrides.directionCount ?? 1,
  };
}
