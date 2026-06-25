import { type DBData } from "../../context";
import {
  BuildingData,
  ClassMapValue,
  CollegeData,
  DivisionData,
  DormData,
  EventData,
  RoomData,
  TableSyncInfo,
} from "../../types";
import { getDB } from "./pgliteDB";
import {
  getLocalBuildingRooms,
  getLocalCollegeRooms,
  getLocalDivisionRooms,
} from "./sync";
import { refreshStoredEventTiming, sortStoredEvents } from "../../event-time";
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
    return data.rows;
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

export async function getJSONFetch<T>(url: string) {
  const req = await fetch(url);
  return (await req.json()) as T;
}

export function getEntity<T>(
  tableName: string,
  getLocalEntity: () => Promise<T[] | undefined>,
): (checker: TableSyncInfo) => Promise<T[]> {
  return async (checker: TableSyncInfo) => {
    try {
      if (checker.valid) {
        const data = await getLocalEntity();
        return data ?? [];
      }
      const fetchedData = await getJSONFetch<T[]>(`/api/${tableName}`);
      return fetchedData;
    } catch {
      return [];
    }
  };
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
    try {
      if (validSync) {
        const data = await getLocalTableRoom(id);
        return data ?? [];
      }
      const fetchedData = await getJSONFetch<{ data: RoomData[] }>(
        `/api/rooms?${entityName}_id=${id}`,
      );
      return fetchedData.data;
    } catch {
      return [];
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
    return fetchedRoomsData;
  } catch {
    return {
      directionCount: 0,
      totalRooms: 0,
    };
  }
}
