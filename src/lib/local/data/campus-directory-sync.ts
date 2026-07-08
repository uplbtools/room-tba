import type { BuildingData, CollegeData, DivisionData } from "@lib/types";
import {
  getBuildings,
  getColleges,
  getDivisions,
  getDorms,
  getOrganizations,
  getPlaces,
  getBuildingRooms,
  getCollegeRooms,
  getDivisionRooms,
} from "./utils";
import {
  checkLocalBuildingRoom,
  checkLocalCollegeRoom,
  checkLocalDivisionRoom,
  localTableSyncCheck,
  syncAliasCache,
  syncBuildingRooms,
  syncBuildings,
  syncCollegeRooms,
  syncColleges,
  syncDivisionRooms,
  syncDivisions,
  syncDorms,
  syncOrganizations,
  syncPlaces,
} from "./sync";

export const OFFLINE_DIRECTORY_SYNCED_AT_KEY = "offline-directory-synced-at";

export type CampusDirectorySyncProgress = {
  phase: "entities" | "rooms" | "aliases" | "done";
  step: number;
  totalSteps: number;
  label: string;
};

export async function syncCampusDirectoryForOffline(options?: {
  onProgress?: (progress: CampusDirectorySyncProgress) => void;
}): Promise<{ ok: boolean; error?: string }> {
  const report = (progress: CampusDirectorySyncProgress) => {
    options?.onProgress?.(progress);
  };

  try {
    const [
      buildingCheck,
      collegeCheck,
      divisionCheck,
      dormCheck,
      organizationCheck,
      placeCheck,
    ] = await Promise.all([
      localTableSyncCheck("buildings"),
      localTableSyncCheck("colleges"),
      localTableSyncCheck("divisions"),
      localTableSyncCheck("dorms"),
      localTableSyncCheck("organizations"),
      localTableSyncCheck("places"),
    ]);

    const [
      buildingLoad,
      collegeLoad,
      divisionLoad,
      dormLoad,
      organizationLoad,
      placeLoad,
    ] = await Promise.all([
      getBuildings(buildingCheck),
      getColleges(collegeCheck),
      getDivisions(divisionCheck),
      getDorms(dormCheck),
      getOrganizations(organizationCheck),
      getPlaces(placeCheck),
    ]);

    report({
      phase: "entities",
      step: 1,
      totalSteps: 4,
      label: "Syncing campus entities…",
    });

    await syncBuildings(
      buildingCheck,
      buildingLoad.rows,
      buildingLoad.source === "remote",
    );
    await syncColleges(
      collegeCheck,
      collegeLoad.rows,
      collegeLoad.source === "remote",
    );
    await syncDivisions(
      divisionCheck,
      divisionLoad.rows,
      divisionLoad.source === "remote",
    );
    await syncDorms(dormCheck, dormLoad.rows, dormLoad.source === "remote");
    await syncOrganizations(
      organizationCheck,
      organizationLoad.rows,
      organizationLoad.source === "remote",
    );
    await syncPlaces(placeCheck, placeLoad.rows, placeLoad.source === "remote");

    const roomTargets: Array<{
      kind: "building" | "college" | "division";
      id: number;
      label: string;
    }> = [
      ...buildingLoad.rows.map((b: BuildingData) => ({
        kind: "building" as const,
        id: b.id,
        label: b.buildingName,
      })),
      ...collegeLoad.rows.map((c: CollegeData) => ({
        kind: "college" as const,
        id: c.id,
        label: c.collegeName,
      })),
      ...divisionLoad.rows.map((d: DivisionData) => ({
        kind: "division" as const,
        id: d.id,
        label: d.divisionName,
      })),
    ];

    report({
      phase: "rooms",
      step: 2,
      totalSteps: 4,
      label: "Downloading room lists…",
    });

    let roomStep = 0;
    for (const target of roomTargets) {
      roomStep += 1;
      report({
        phase: "rooms",
        step: 2,
        totalSteps: 4,
        label: `Rooms: ${target.label} (${roomStep}/${roomTargets.length})`,
      });

      if (target.kind === "building") {
        const valid = await checkLocalBuildingRoom(target.id);
        const rooms = await getBuildingRooms(valid, target.id);
        await syncBuildingRooms(valid, target.id, rooms);
      } else if (target.kind === "college") {
        const valid = await checkLocalCollegeRoom(target.id);
        const rooms = await getCollegeRooms(valid, target.id);
        await syncCollegeRooms(valid, target.id, rooms);
      } else {
        const valid = await checkLocalDivisionRoom(target.id);
        const rooms = await getDivisionRooms(valid, target.id);
        await syncDivisionRooms(valid, target.id, rooms);
      }
    }

    report({
      phase: "aliases",
      step: 3,
      totalSteps: 4,
      label: "Syncing search aliases…",
    });
    await syncAliasCache();

    localStorage.setItem(
      OFFLINE_DIRECTORY_SYNCED_AT_KEY,
      new Date().toISOString(),
    );

    report({
      phase: "done",
      step: 4,
      totalSteps: 4,
      label: "Campus directory saved offline.",
    });

    return { ok: true };
  } catch (error) {
    console.error("Campus directory offline sync failed:", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Campus directory download failed.",
    };
  }
}
