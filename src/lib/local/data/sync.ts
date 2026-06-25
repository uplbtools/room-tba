import type {
  BuildingData,
  CollegeData,
  DivisionData,
  DormData,
  EventData,
  RoomData,
  TableSyncInfo,
} from "../../types";
import { getDB } from "./pgliteDB";
import { getJSONFetch } from "./utils";
import { syncToastStore } from "../../store.svelte";
import type { Results } from "@electric-sql/pglite";

export function getSyncKeysFromLs(): {
  [key: string]: string;
} | null {
  const lsStore = localStorage.getItem("sync-key");

  if (lsStore === null) {
    localStorage.setItem(
      "sync-key",
      `{
      "buildings": "",
      "colleges": "",
      "divisions": "",
      "rooms": "",
      "dorms": "",
      "classes": "",
      "events": ""
    }`,
    );
    return null;
  }

  try {
    const keys = JSON.parse(lsStore);
    if (typeof keys === "object" && "buildings" in keys) {
      return keys as {
        [key: string]: string;
      };
    } else {
      return null;
    }
  } catch {
    console.error("Error: the sync keys in the localStorage was corrupted");
    localStorage.setItem(
      "sync-key",
      `{
      "buildings": "",
      "colleges": "",
      "divisions": "",
      "rooms": "",
      "dorms": "",
      "classes": "",
      "events": ""
    }`,
    );
    return null;
  }
}

export async function localTableSyncCheck(
  tableName: string,
): Promise<TableSyncInfo> {
  try {
    const remoteSyncKey = await getSyncKey(tableName);
    const syncKeyLs = getSyncKeysFromLs();
    if (syncKeyLs === null)
      return {
        valid: false,
        newKey: remoteSyncKey,
      };
    const tableSyncKey = syncKeyLs[tableName];
    return {
      valid:
        typeof tableSyncKey === "string" &&
        remoteSyncKey !== null &&
        tableSyncKey === remoteSyncKey,
      newKey: remoteSyncKey,
    };
  } catch (e) {
    console.error(e);
    return {
      valid: false,
      newKey: null,
    };
  }
}

export function updateSyncKeyFromLs(tableName: string, newKey: string) {
  const syncKeys = getSyncKeysFromLs();
  if (syncKeys === null) return;
  syncKeys[tableName] = newKey;
  localStorage.setItem("sync-key", JSON.stringify(syncKeys));
}

export async function getSyncKey(table: string) {
  try {
    const tableOnline = await getJSONFetch<{
      success: boolean;
      error: string | null;
      data: {
        id: number;
        tableName: string | null;
        syncKey: string | null;
      };
    }>(`/api/check/${table}`);
    return tableOnline.data.syncKey;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function syncBuildings(
  checker: TableSyncInfo,
  remoteBuildings: BuildingData[],
) {
  if (checker.valid) return;
  const localDB = getDB();

  await localDB.waitReady;
  syncToastStore.startBuildingsSync(remoteBuildings.length);
  for (const b of remoteBuildings) {
    try {
      await localDB.query(
        `
        INSERT INTO buildings (id, building_name, lon, lat, directions, type, rooms_fetched, version, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, false, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
        id = EXCLUDED.id,
        building_name = EXCLUDED.building_name,
        lon = EXCLUDED.lon,
        lat = EXCLUDED.lat,
        directions = EXCLUDED.directions,
        type = EXCLUDED.type,
        rooms_fetched = EXCLUDED.rooms_fetched,
        version = EXCLUDED.version,
        updated_at = EXCLUDED.updated_at;
        `,
        [
          b.id,
          b.buildingName,
          b.lon,
          b.lat,
          b.directions,
          b.buildingType,
          b.version,
          b.updatedAt,
        ],
      );
      syncToastStore.updateBuildingsSync();
    } catch (e) {
      console.error(e);
    }
  }
  updateSyncKeyFromLs("buildings", checker.newKey ?? "");
}

export async function syncColleges(
  checker: TableSyncInfo,
  remoteColleges: CollegeData[],
) {
  if (checker.valid) return;

  const localDB = getDB();

  await localDB.waitReady;
  syncToastStore.startCollegesSync(remoteColleges.length);
  for (const college of remoteColleges) {
    try {
      await localDB.query(
        `
        INSERT INTO colleges (id, college_name, rooms_fetched, version, updated_at)
        VALUES ($1, $2, false, $3, $4)
        ON CONFLICT (id) DO UPDATE SET
        id = EXCLUDED.id,
        college_name = EXCLUDED.college_name,
        rooms_fetched = EXCLUDED.rooms_fetched,
        version = EXCLUDED.version,
        updated_at = EXCLUDED.updated_at;
        `,
        [college.id, college.collegeName, college.version, college.updatedAt],
      );
      syncToastStore.updateCollegesSync();
    } catch (e) {
      console.error(e);
    }
  }

  updateSyncKeyFromLs("colleges", checker.newKey ?? "");
}

export async function syncDivisions(
  checker: TableSyncInfo,
  remoteDivisions: DivisionData[],
) {
  if (checker.valid) return;

  const localDB = getDB();

  await localDB.waitReady;
  syncToastStore.startDivisionsSync(remoteDivisions.length);
  for (const division of remoteDivisions) {
    try {
      await localDB.query(
        `
        INSERT INTO divisions (id, division_name, college_id, rooms_fetched, version, updated_at)
        VALUES ($1, $2, $3, false, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
        id = EXCLUDED.id,
        division_name = EXCLUDED.division_name,
        college_id = EXCLUDED.college_id,
        rooms_fetched = EXCLUDED.rooms_fetched,
        version = EXCLUDED.version,
        updated_at = EXCLUDED.updated_at;
        `,
        [
          division.id,
          division.divisionName,
          division.collegeId,
          division.version,
          division.updatedAt,
        ],
      );
      syncToastStore.updateDivisionsSync();
    } catch (e) {
      console.error(e);
    }
  }
  updateSyncKeyFromLs("divisions", checker.newKey ?? "");
}

export async function syncDorms(
  checker: TableSyncInfo,
  remoteDorms: DormData[],
) {
  if (checker.valid) return;

  const localDB = getDB();

  await localDB.waitReady;
  syncToastStore.startDormsSync(remoteDorms.length);
  for (const b of remoteDorms) {
    try {
      await localDB.query(
        `
        INSERT INTO dorms (id, dorm_name, short_name, lat, lon, gender, capacity, managing_office, contact_email, amenities, osm_link, description, is_up_managed, price_range, contact_phone, facebook_link, version, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (id) DO UPDATE SET
        id = EXCLUDED.id,
        dorm_name = EXCLUDED.dorm_name,
        short_name = EXCLUDED.short_name,
        lat = EXCLUDED.lat,
        lon = EXCLUDED.lon,
        gender = EXCLUDED.gender,
        capacity = EXCLUDED.capacity,
        managing_office = EXCLUDED.managing_office,
        contact_email = EXCLUDED.contact_email,
        amenities = EXCLUDED.amenities,
        osm_link = EXCLUDED.osm_link,
        description = EXCLUDED.description,
        is_up_managed = EXCLUDED.is_up_managed,
        price_range = EXCLUDED.price_range,
        contact_phone = EXCLUDED.contact_phone,
        facebook_link = EXCLUDED.facebook_link,
        version = EXCLUDED.version,
        updated_at = EXCLUDED.updated_at;
        `,
        [
          b.id,
          b.dormName,
          b.shortName,
          b.lat,
          b.lon,
          b.gender,
          b.capacity,
          b.managingOffice,
          b.contactEmail,
          `{${b.amenities ? b.amenities.map((amenity) => `'${amenity}'`).join(",") : ""}}`,
          b.osmLink,
          b.description,
          b.isUpManaged,
          b.priceRange,
          b.contactPhone,
          b.facebookLink,
          b.version,
          b.updatedAt,
        ],
      );
      syncToastStore.updateDormsSync();
    } catch (e) {
      console.error(e);
    }
  }
  updateSyncKeyFromLs("dorms", checker.newKey ?? "");
}

export async function syncEvents(
  checker: TableSyncInfo,
  remoteEvents: EventData[],
) {
  if (checker.valid) return;

  const localDB = getDB();
  await localDB.waitReady;
  syncToastStore.startEventsSync(remoteEvents.length);

  // Events span four related tables, so the cache rebuild must be all-or-nothing.
  // Run it inside a single transaction: any failure rolls back the delete +
  // partial inserts, and we leave the sync key untouched so the stale-but-complete
  // cache is retried on the next sync instead of being marked up to date.
  try {
    await localDB.transaction(async (tx) => {
      await tx.exec(`
        DELETE FROM event_route_stops;
        DELETE FROM event_routes;
        DELETE FROM event_locations;
        DELETE FROM events;
      `);

      for (const event of remoteEvents) {
        await tx.query(
          `
        INSERT INTO events (
          id, slug, title, description, category, starts_at, ends_at, timezone,
          recurrence, is_active, source_url, priority, include_in_seo, version,
          updated_at, status, occurrence_starts_at, occurrence_ends_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18);
        `,
          [
            event.id,
            event.slug,
            event.title,
            event.description,
            event.category,
            event.startsAt,
            event.endsAt,
            event.timezone,
            event.recurrence,
            event.isActive,
            event.sourceUrl,
            event.priority,
            event.includeInSeo,
            event.version,
            event.updatedAt,
            event.status,
            event.occurrenceStartsAt,
            event.occurrenceEndsAt,
          ],
        );

        for (const location of event.locations) {
          await tx.query(
            `
          INSERT INTO event_locations (
            id, event_id, anchor_type, building_id, dorm_id, label, lat, lon,
            highlight_priority, sort_order, is_primary, updated_at, resolved_lat,
            resolved_lon, resolved_label, building_name, dorm_name
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17);
          `,
            [
              location.id,
              location.eventId,
              location.anchorType,
              location.buildingId,
              location.dormId,
              location.label,
              location.lat,
              location.lon,
              location.highlightPriority,
              location.sortOrder,
              location.isPrimary,
              location.updatedAt,
              location.resolvedLat,
              location.resolvedLon,
              location.resolvedLabel,
              location.buildingName,
              location.dormName,
            ],
          );
        }

        for (const route of event.routes) {
          await tx.query(
            `
          INSERT INTO event_routes (id, event_id, name, description, sort_order, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6);
          `,
            [
              route.id,
              route.eventId,
              route.name,
              route.description,
              route.sortOrder,
              route.updatedAt,
            ],
          );

          for (const stop of route.stops) {
            await tx.query(
              `
            INSERT INTO event_route_stops (
              id, route_id, event_location_id, label, lat, lon, sort_order,
              updated_at, resolved_lat, resolved_lon, resolved_label
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
            `,
              [
                stop.id,
                stop.routeId,
                stop.eventLocationId,
                stop.label,
                stop.lat,
                stop.lon,
                stop.sortOrder,
                stop.updatedAt,
                stop.resolvedLat,
                stop.resolvedLon,
                stop.resolvedLabel,
              ],
            );
          }
        }

        syncToastStore.updateEventsSync();
      }
    });
  } catch (e) {
    console.error("Failed to sync events; keeping previous cache", e);
    return;
  }

  updateSyncKeyFromLs("events", checker.newKey ?? "");
}

export async function resetBuildingsSyncStatus() {
  try {
    const localDB = getDB();
    await localDB.waitReady;
    await localDB.exec(`UPDATE buildings SET rooms_fetched = false`);
  } catch (e) {
    console.error(e);
  }
}

export async function localBuildingSyncStatus(id: number) {
  try {
    const localDB = getDB();
    await localDB.waitReady;
    const data = (await localDB.query(
      `
            SELECT rooms_fetched AS "roomsFetched"
            FROM buildings
            WHERE id = $1
        `,
      [id],
    )) as Results<{ roomsFetched: boolean }>;
    if (data.rows.length === 0)
      throw new Error("Can't fetch a missing building row");
    return data.rows[0];
  } catch (e) {
    console.error(e);
  }
}

export async function getLocalBuildingRooms(id: number) {
  try {
    const localDB = getDB();
    await localDB.waitReady;
    const data = (await localDB.query(
      `
    SELECT
    r.id,
    r.room_code AS code,
    r.directions AS directions,
    json_build_object('name',b.building_name, 'lat', b.lat, 'lon', b.lon, 'directions', b.directions ) as building,
    c.college_name as "collegeName",
    d.division_name as "divisionName",
    r.building_id as "buildingId",
    r.college_id as "collegeId",
    r.division_id as "divisionId",
    r.version,
    r.updated_at as "updatedAt"
    FROM rooms AS r
    LEFT JOIN buildings AS b ON b.id = r.building_id
    LEFT JOIN colleges as c ON c.id = r.college_id
    LEFT JOIN divisions AS d ON d.id = r.division_id
    WHERE r.building_id = $1;
    `,
      [id],
    )) as Results<RoomData>;
    return data.rows;
  } catch (e) {
    console.error(e);
  }
}

export async function checkLocalBuildingRoom(id: number) {
  try {
    const remoteSyncKey = await getSyncKey("rooms");
    const syncKeyLs = getSyncKeysFromLs();
    if (syncKeyLs === null) {
      await resetBuildingsSyncStatus();
      return false;
    }

    const roomSyncKey = syncKeyLs["rooms"];
    if (
      !(
        typeof roomSyncKey === "string" &&
        remoteSyncKey !== null &&
        remoteSyncKey === roomSyncKey
      )
    ) {
      await resetBuildingsSyncStatus();
      return false;
    }

    const buildingSyncStatus = await localBuildingSyncStatus(id);
    if (!buildingSyncStatus || !buildingSyncStatus.roomsFetched) return false;

    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function syncBuildingRooms(
  validSync: boolean,
  id: number,
  rooms: RoomData[],
) {
  if (validSync) return;
  const localDB = getDB();
  for (const room of rooms) {
    try {
      await localDB.query(
        `
            INSERT INTO rooms (id, room_code, directions, building_id, college_id, division_id, version, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (id) DO UPDATE SET
            id = EXCLUDED.id,
            room_code = EXCLUDED.room_code,
            directions = EXCLUDED.directions,
            building_id = EXCLUDED.building_id,
            college_id = EXCLUDED.college_id,
            division_id = EXCLUDED.division_id,
            version = EXCLUDED.version,
            updated_at = EXCLUDED.updated_at;
            `,
        [
          room.id,
          room.code,
          room.directions,
          room.buildingId,
          room.collegeId,
          room.divisionId,
          room.version,
          room.updatedAt,
        ],
      );
    } catch (e) {
      console.error(e);
    }
  }
  await localDB.query(
    `UPDATE buildings SET rooms_fetched = true WHERE id = $1`,
    [id],
  );
}

export async function resetCollegesSyncStatus() {
  try {
    const localDB = getDB();
    await localDB.waitReady;
    await localDB.exec(`UPDATE colleges SET rooms_fetched = false`);
  } catch (e) {
    console.error(e);
  }
}

export async function localCollegeSyncStatus(id: number) {
  try {
    const localDB = getDB();
    await localDB.waitReady;
    const data = (await localDB.query(
      `
            SELECT rooms_fetched as "roomsFetched"
            FROM colleges
            WHERE id = $1;
        `,
      [id],
    )) as Results<{ roomsFetched: boolean }>;
    if (data.rows.length === 0)
      throw new Error("Can't fetch a missing college row");
    return data.rows[0];
  } catch (e) {
    console.error(e);
  }
}

export async function getLocalCollegeRooms(id: number) {
  try {
    const localDB = getDB();
    await localDB.waitReady;
    const data = (await localDB.query(
      `
    SELECT
    r.id,
    r.room_code AS code,
    r.directions AS directions,
    json_build_object('name',b.building_name, 'lat', b.lat, 'lon', b.lon, 'directions', b.directions ) as building,
    c.college_name as "collegeName",
    d.division_name as "divisionName",
    r.building_id as "buildingId",
    r.college_id as "collegeId",
    r.division_id as "divisionId",
    r.version,
    r.updated_at as "updatedAt"
    FROM rooms AS r
    LEFT JOIN buildings AS b ON b.id = r.building_id
    LEFT JOIN colleges as c ON c.id = r.college_id
    LEFT JOIN divisions AS d ON d.id = r.division_id
    WHERE r.college_id = $1;
    `,
      [id],
    )) as Results<RoomData>;
    return data.rows;
  } catch (e) {
    console.error(e);
  }
}

export async function checkLocalCollegeRoom(id: number) {
  try {
    const remoteSyncKey = await getSyncKey("rooms");
    const syncKeyLs = getSyncKeysFromLs();
    if (syncKeyLs === null) {
      await resetCollegesSyncStatus();
      return false;
    }

    const roomSyncKey = syncKeyLs["rooms"];
    if (
      !(
        typeof roomSyncKey === "string" &&
        remoteSyncKey !== null &&
        remoteSyncKey === roomSyncKey
      )
    ) {
      await resetCollegesSyncStatus();
      return false;
    }

    const collegeSyncStatus = await localCollegeSyncStatus(id);
    if (!collegeSyncStatus || !collegeSyncStatus.roomsFetched) return false;

    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function syncCollegeRooms(
  validSync: boolean,
  id: number,
  rooms: RoomData[],
) {
  if (validSync) return;
  const localDB = getDB();
  for (const room of rooms) {
    try {
      await localDB.query(
        `
            INSERT INTO rooms (id, room_code, directions, building_id, college_id, division_id, version, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (id) DO UPDATE SET
            id = EXCLUDED.id,
            room_code = EXCLUDED.room_code,
            directions = EXCLUDED.directions,
            building_id = EXCLUDED.building_id,
            college_id = EXCLUDED.college_id,
            division_id = EXCLUDED.division_id,
            version = EXCLUDED.version,
            updated_at = EXCLUDED.updated_at;
            `,
        [
          room.id,
          room.code,
          room.directions,
          room.buildingId,
          room.collegeId,
          room.divisionId,
          room.version,
          room.updatedAt,
        ],
      );
    } catch (e) {
      console.error(e);
    }
  }
  await localDB.query(
    `UPDATE colleges SET rooms_fetched = true WHERE id = $1`,
    [id],
  );
}

export async function resetDivisionsSyncStatus() {
  try {
    const localDB = getDB();
    await localDB.waitReady;
    await localDB.exec(`UPDATE divisions SET rooms_fetched = false`);
  } catch (e) {
    console.error(e);
  }
}

export async function localDivisionSyncStatus(id: number) {
  try {
    const localDB = getDB();
    await localDB.waitReady;
    const data = (await localDB.query(
      `
            SELECT rooms_fetched as "roomsFetched"
            FROM divisions
            WHERE id = $1;
        `,
      [id],
    )) as Results<{ roomsFetched: boolean }>;
    if (data.rows.length === 0)
      throw new Error("Can't fetch a missing division row");
    return data.rows[0];
  } catch (e) {
    console.error(e);
  }
}

export async function getLocalDivisionRooms(id: number) {
  try {
    const localDB = getDB();
    await localDB.waitReady;
    const data = (await localDB.query(
      `
    SELECT
    r.id,
    r.room_code AS code,
    r.directions AS directions,
    json_build_object('name',b.building_name, 'lat', b.lat, 'lon', b.lon, 'directions', b.directions ) as building,
    c.college_name as "collegeName",
    d.division_name as "divisionName",
    r.building_id as "buildingId",
    r.college_id as "collegeId",
    r.division_id as "divisionId",
    r.version,
    r.updated_at as "updatedAt"
    FROM rooms AS r
    LEFT JOIN buildings AS b ON b.id = r.building_id
    LEFT JOIN colleges as c ON c.id = r.college_id
    LEFT JOIN divisions AS d ON d.id = r.division_id
    WHERE r.division_id = $1;
    `,
      [id],
    )) as Results<RoomData>;
    return data.rows;
  } catch (e) {
    console.error(e);
  }
}

export async function checkLocalDivisionRoom(id: number) {
  try {
    const remoteSyncKey = await getSyncKey("rooms");
    const syncKeyLs = getSyncKeysFromLs();
    if (syncKeyLs === null) {
      await resetDivisionsSyncStatus();
      return false;
    }

    const roomSyncKey = syncKeyLs["rooms"];
    if (
      !(
        typeof roomSyncKey === "string" &&
        remoteSyncKey !== null &&
        remoteSyncKey === roomSyncKey
      )
    ) {
      await resetDivisionsSyncStatus();
      return false;
    }

    const divisionSyncStatus = await localDivisionSyncStatus(id);
    if (!divisionSyncStatus || !divisionSyncStatus.roomsFetched) return false;

    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function syncDivisionRooms(
  validSync: boolean,
  id: number,
  rooms: RoomData[],
) {
  if (validSync) return;
  const localDB = getDB();
  for (const room of rooms) {
    try {
      await localDB.query(
        `
            INSERT INTO rooms (id, room_code, directions, building_id, college_id, division_id, version, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (id) DO UPDATE SET
            id = EXCLUDED.id,
            room_code = EXCLUDED.room_code,
            directions = EXCLUDED.directions,
            building_id = EXCLUDED.building_id,
            college_id = EXCLUDED.college_id,
            division_id = EXCLUDED.division_id,
            version = EXCLUDED.version,
            updated_at = EXCLUDED.updated_at;
            `,
        [
          room.id,
          room.code,
          room.directions,
          room.buildingId,
          room.collegeId,
          room.divisionId,
          room.version,
          room.updatedAt,
        ],
      );
    } catch (e) {
      console.error(e);
    }
  }
  await localDB.query(
    `UPDATE divisions SET rooms_fetched = true WHERE id = $1`,
    [id],
  );
}
