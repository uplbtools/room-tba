import { type DBData } from "@lib/context";
import type {
  BuildingData,
  ClassMapValue,
  CollegeData,
  DivisionData,
  DormData,
  EntityLoadResult,
  EventData,
  RoomData,
  TableSyncInfo,
} from "@lib/types";
import { getDB } from "./pgliteDB";
import { ENTITY_FETCH_OPTIONS, fetchJsonWithRetry } from "./fetch-json";
import {
  getLocalBuildingRooms,
  getLocalCollegeRooms,
  getLocalDivisionRooms,
} from "./sync";
import { refreshStoredEventTiming, sortStoredEvents } from "@lib/event-time";
import { normalizeAlias } from "@lib/site";
import { normalizeDormListFields } from "@lib/string-lists";
import type { Results } from "@electric-sql/pglite";

export async function getLocalBuildings(): Promise<BuildingData[] | undefined> {
  try {
    const localDB = getDB();
    await localDB.waitReady;
    const data = (await localDB.query(`
        SELECT building_name AS "buildingName", lon, lat, id, directions, type AS "buildingType", version, updated_at AS "updatedAt" FROM buildings
      `)) as Results<BuildingData>;
    return data.rows;
  } catch (e) {
    console.error("Error: ", e);
    return undefined;
  }
}

export async function getLocalColleges(): Promise<CollegeData[] | undefined> {
  try {
    const localDB = getDB();
    await localDB.waitReady;
    const data = (await localDB.query(`
        SELECT college_name AS "collegeName", id, version, updated_at AS "updatedAt" FROM colleges;
      `)) as Results<CollegeData>;
    return data.rows;
  } catch (e) {
    console.error("Error: ", e);
    return undefined;
  }
}

export async function getLocalDivisions(): Promise<DivisionData[] | undefined> {
  try {
    const localDB = getDB();
    await localDB.waitReady;
    const data = (await localDB.query(`
        SELECT division_name AS "divisionName", id, version, updated_at AS "updatedAt" FROM divisions;
      `)) as Results<DivisionData>;
    return data.rows;
  } catch (e) {
    console.error("Error: ", e);
    return undefined;
  }
}

export async function getLocalDorms(): Promise<DormData[] | undefined> {
  try {
    const localDB = getDB();
    await localDB.waitReady;
    const data = (await localDB.query(`
      SELECT
        id,
        dorm_name AS "dormName",
        short_name AS "shortName",
        lat,
        lon,
        gender,
        capacity,
        managing_office AS "managingOffice",
        contact_email AS "contactEmail",
        amenities,
        osm_link AS "osmLink",
        description,
        is_up_managed AS "isUpManaged",
        price_range AS "priceRange",
        contact_phone AS "contactPhone",
        facebook_link AS "facebookLink",
        version,
        updated_at AS "updatedAt"
      FROM dorms;
      `)) as Results<DormData>;
    return data.rows.map((row) => normalizeDormListFields(row));
  } catch (e) {
    console.error("Error: ", e);
    return undefined;
  }
}

export async function getLocalEvents(): Promise<EventData[] | undefined> {
  try {
    const localDB = getDB();
    await localDB.waitReady;
    const [events, locations, routes, stops] = await Promise.all([
      localDB.query(`
        SELECT
          id,
          slug,
          title,
          description,
          category,
          starts_at AS "startsAt",
          ends_at AS "endsAt",
          timezone,
          recurrence,
          is_active AS "isActive",
          source_url AS "sourceUrl",
          priority,
          include_in_seo AS "includeInSeo",
          version,
          updated_at AS "updatedAt",
          status,
          occurrence_starts_at AS "occurrenceStartsAt",
          occurrence_ends_at AS "occurrenceEndsAt"
        FROM events;
      `) as Promise<Results<Omit<EventData, "locations" | "routes">>>,
      localDB.query(`
        SELECT
          id,
          event_id AS "eventId",
          anchor_type AS "anchorType",
          building_id AS "buildingId",
          dorm_id AS "dormId",
          label,
          lat,
          lon,
          highlight_priority AS "highlightPriority",
          sort_order AS "sortOrder",
          is_primary AS "isPrimary",
          updated_at AS "updatedAt",
          resolved_lat AS "resolvedLat",
          resolved_lon AS "resolvedLon",
          resolved_label AS "resolvedLabel",
          building_name AS "buildingName",
          dorm_name AS "dormName"
        FROM event_locations
        ORDER BY sort_order, id;
      `) as Promise<Results<EventData["locations"][number]>>,
      localDB.query(`
        SELECT
          id,
          event_id AS "eventId",
          name,
          description,
          sort_order AS "sortOrder",
          updated_at AS "updatedAt"
        FROM event_routes
        ORDER BY sort_order, id;
      `) as Promise<Results<Omit<EventData["routes"][number], "stops">>>,
      localDB.query(`
        SELECT
          id,
          route_id AS "routeId",
          event_location_id AS "eventLocationId",
          label,
          lat,
          lon,
          sort_order AS "sortOrder",
          updated_at AS "updatedAt",
          resolved_lat AS "resolvedLat",
          resolved_lon AS "resolvedLon",
          resolved_label AS "resolvedLabel"
        FROM event_route_stops
        ORDER BY sort_order, id;
      `) as Promise<Results<EventData["routes"][number]["stops"][number]>>,
    ]);

    return sortStoredEvents(
      events.rows.map((event) =>
        refreshStoredEventTiming({
          ...event,
          locations: locations.rows.filter(
            (location) => location.eventId === event.id,
          ),
          routes: routes.rows
            .filter((route) => route.eventId === event.id)
            .map((route) => ({
              ...route,
              stops: stops.rows.filter((stop) => stop.routeId === route.id),
            })),
        }),
      ),
    );
  } catch (e) {
    console.error("Error: ", e);
    return undefined;
  }
}

export async function getLocalRoomByCode(code: string) {
  try {
    const normalizedCode = code.toUpperCase();
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
            WHERE upper(r.room_code) = $1
        `,
      [normalizedCode],
    )) as Results<RoomData>;
    if (data.rows.length === 0 && typeof data.rows[0] === "undefined")
      return null;
    return data.rows[0] as RoomData;
  } catch (e) {
    console.error(e);
    return null;
  }
}

export async function getLocalRoomById(id: number) {
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
            WHERE r.id = $1
        `,
      [id],
    )) as Results<RoomData>;
    if (data.rows.length === 0) return null;
    return data.rows[0] as RoomData;
  } catch (e) {
    console.error(e);
    return null;
  }
}

// export async function getLocalRooms(): Promise<RoomData[] | undefined> {
//   try {
//     const localDB = getDB();

//     await localDB.waitReady;
//     const data = (await localDB.query(`
//       SELECT
//         r.room_code AS code,
//         r.directions AS directions,
//         json_build_object('name',b.building_name, 'lat', b.lat, 'lon', b.lon, 'directions', b.directions ) as building,
//         c.college_name as "collegeName",
//         d.division_name as "divisionName",
//         r.building_id as "buildingId",
//         r.college_id as "collegeId",
//         r.division_id as "divisionId"
//       FROM rooms AS r
//       LEFT JOIN buildings AS b ON b.id = r.building_id
//       LEFT JOIN colleges as c ON c.id = r.college_id
//       LEFT JOIN divisions AS d ON d.id = r.division_id;
//       `)) as Results<RoomData>;
//     return data.rows;
//   } catch (e) {
//     console.error("Error: ", e);
//     return undefined;
//   }
// }

export async function getLocalClasses(): Promise<ClassMapValue[] | undefined> {
  try {
    const localDB = getDB();

    await localDB.waitReady;
    const data = (await localDB.query(`
      SELECT
        c.id,
        c.course_code as "courseCode",
        c.section,
        c.type,
        c.schedule,
        c.directions,
        c.course_title as "courseTitle",
        c.term_id as "termId",
        c.room_id as "roomId"
      FROM classes AS c
      LEFT JOIN rooms AS r ON r.id = c.room_id;
    `)) as Results<ClassMapValue>;
    return data.rows;
  } catch (e) {
    console.error("Error: ", e);
    return undefined;
  }
}

export async function loadCachedAppData(): Promise<DBData> {
  const [buildings, colleges, divisions, dorms, events, roomsMeta] =
    await Promise.all([
      getLocalBuildings().then((rows) => rows ?? []),
      getLocalColleges().then((rows) => rows ?? []),
      getLocalDivisions().then((rows) => rows ?? []),
      getLocalDorms().then((rows) => rows ?? []),
      getLocalEvents().then((rows) => rows ?? []),
      getLocalRoomsCounts(),
    ]);

  return {
    buildings,
    colleges,
    divisions,
    dorms,
    events,
    directionCount: roomsMeta.directionCount,
    totalRooms: roomsMeta.totalRooms,
  };
}

export async function getJSONFetch<T>(url: string) {
  const req = await fetch(url);
  return (await req.json()) as T;
}

export function getEntity<T>(
  tableName: string,
  getLocalEntity: () => Promise<T[] | undefined>,
): (checker: TableSyncInfo) => Promise<EntityLoadResult<T>> {
  return async (checker: TableSyncInfo) => {
    const local = async () => (await getLocalEntity()) ?? [];
    if (checker.valid) {
      const cached = await local();
      // localStorage sync key can outlive PGlite (IDB eviction, cleared site data).
      // Treat an empty cache as stale so we refetch instead of showing no events.
      if (cached.length > 0) {
        return { rows: cached, source: "cache" };
      }
    }
    try {
      const fetchedData = await fetchJsonWithRetry<T[]>(
        `/api/${tableName}`,
        ENTITY_FETCH_OPTIONS,
      );
      if (Array.isArray(fetchedData)) {
        return { rows: fetchedData, source: "remote" };
      }
      const cached = await local();
      return { rows: cached, source: "cache" };
    } catch {
      const cached = await local();
      return { rows: cached, source: "cache" };
    }
  };
}

export async function fetchRemoteEvents(): Promise<EventData[]> {
  return fetchJsonWithRetry<EventData[]>("/api/events", ENTITY_FETCH_OPTIONS);
}

export const getBuildings = getEntity<BuildingData>(
  "buildings",
  getLocalBuildings,
);

export const getColleges = getEntity<CollegeData>("colleges", getLocalColleges);

export const getDivisions = getEntity<DivisionData>(
  "divisions",
  getLocalDivisions,
);

export const getDorms = getEntity<DormData>("dorms", getLocalDorms);

export const getEvents = getEntity<EventData>("events", getLocalEvents);

export const getClasses = getEntity<ClassMapValue>("classes", getLocalClasses);

export function getEntityRooms(
  entityName: string,
  getLocalTableRoom: (id: number) => Promise<RoomData[] | undefined>,
) {
  return async (validSync: boolean, id: number) => {
    const loadLocal = async () => (await getLocalTableRoom(id)) ?? [];
    if (validSync) return loadLocal();
    const url = `/api/rooms?${entityName}_id=${id}`;
    try {
      const response = await fetch(url);
      const fetchedData = (await response.json()) as { data?: RoomData[] };
      if (response.ok && Array.isArray(fetchedData?.data)) {
        return fetchedData.data;
      }
      // Authoritative empty entity (e.g. 404): do not resurrect stale cache.
      if (response.status === 404) {
        return [];
      }
      const cached = await loadLocal();
      return cached.length > 0 ? cached : [];
    } catch {
      const cached = await loadLocal();
      return cached;
    }
  };
}

export const getBuildingRooms = getEntityRooms(
  "building",
  getLocalBuildingRooms,
);

export const getCollegeRooms = getEntityRooms("college", getLocalCollegeRooms);

export const getDivisionRooms = getEntityRooms(
  "division",
  getLocalDivisionRooms,
);

export async function getRoomsData(): Promise<
  Pick<DBData, "directionCount" | "totalRooms">
> {
  try {
    const fetchedRoomsData =
      await getJSONFetch<Pick<DBData, "directionCount" | "totalRooms">>(
        "/api/rooms-update",
      );
    if (
      typeof fetchedRoomsData?.totalRooms === "number" &&
      fetchedRoomsData.totalRooms > 0
    ) {
      return fetchedRoomsData;
    }
    // Offline / empty response: derive counts from cached PGlite rows.
    const local = await getLocalRoomsCounts();
    return local.totalRooms > 0 ? local : fetchedRoomsData;
  } catch {
    return getLocalRoomsCounts();
  }
}

/** Room counts derived from the local PGlite cache (offline fallback). */
export async function getLocalRoomsCounts(): Promise<
  Pick<DBData, "directionCount" | "totalRooms">
> {
  try {
    const localDB = getDB();
    await localDB.waitReady;
    const total = (await localDB.query(
      `SELECT COUNT(*)::int AS count FROM rooms`,
    )) as Results<{ count: number }>;
    const directed = (await localDB.query(
      `SELECT COUNT(*)::int AS count FROM rooms WHERE directions IS NOT NULL`,
    )) as Results<{ count: number }>;
    return {
      totalRooms: total.rows[0]?.count ?? 0,
      directionCount: directed.rows[0]?.count ?? 0,
    };
  } catch (e) {
    console.error(e);
    return { directionCount: 0, totalRooms: 0 };
  }
}

/** Local room-code search mirroring the server `search_code` behavior, used as
 * an offline fallback for search suggestions. Returns up to 6 matches, or null
 * when there are none (matching the server contract). */
export async function searchLocalRooms(
  searchString: string,
): Promise<{ value: string }[] | null> {
  try {
    const escaped = searchString
      .replace(/\\/g, "\\\\")
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_");
    const localDB = getDB();
    await localDB.waitReady;
    const data = (await localDB.query(
      `SELECT room_code AS value FROM rooms
       WHERE upper(room_code) LIKE upper($1) ESCAPE '\\'
       ORDER BY length(room_code), room_code
       LIMIT 6`,
      [`%${escaped}%`],
    )) as Results<{ value: string }>;
    return data.rows.length ? data.rows : null;
  } catch (e) {
    console.error(e);
    return null;
  }
}

/** Offline alias lookup against the PGlite cache (#155 follow-up). */
export async function searchLocalAliases(
  searchString: string,
): Promise<{ alias: string; value: string }[]> {
  const normalized = normalizeAlias(searchString);
  if (!normalized) return [];
  try {
    const localDB = getDB();
    await localDB.waitReady;
    const data = (await localDB.query(
      `
      SELECT
        a.alias,
        COALESCE(b.building_name, a.building_name) AS value,
        a.normalized_alias AS "normalizedAlias"
      FROM aliases AS a
      LEFT JOIN buildings AS b
        ON a.target_type = 'building' AND b.id = a.target_id
      WHERE COALESCE(b.building_name, a.building_name) IS NOT NULL
        AND (a.normalized_alias = $1 OR a.normalized_alias LIKE $2)
      ORDER BY CASE WHEN a.normalized_alias = $1 THEN 0 ELSE 1 END, a.alias
      LIMIT 12
      `,
      [normalized, `${normalized}%`],
    )) as Results<{ alias: string; value: string; normalizedAlias: string }>;

    const seen = new Set<string>();
    return data.rows.filter((row) => {
      if (!row.value || seen.has(row.value)) return false;
      seen.add(row.value);
      return true;
    });
  } catch (e) {
    console.error(e);
    return [];
  }
}
