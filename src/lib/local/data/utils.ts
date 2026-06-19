import { Result } from "pg";
import { type DBData } from "../../context";
import {
  BuildingData,
  ClassMapValue,
  CollegeData,
  DivisionData,
  DormData,
  RoomData,
  TableSyncInfo,
} from "../../types";
import { getDB } from "./pgliteDB";
import {
  getLocalBuildingRooms,
  checkLocalBuildingRoom,
  checkLocalCollegeRoom,
  getLocalCollegeRooms,
  checkLocalDivisionRoom,
  getLocalDivisionRooms,
} from "./sync";

export async function getLocalBuildings(): Promise<BuildingData[] | undefined> {
  try {
    const localDB = getDB();
    await localDB.waitReady;
    const data = (await localDB.query(`
        SELECT building_name AS "buildingName", lon, lat, id, directions FROM buildings
      `)) as Result<BuildingData>;
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
        SELECT college_name AS "collegeName", id FROM colleges;
      `)) as Result<CollegeData>;
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
        SELECT division_name AS "divisionName", id FROM divisions;
      `)) as Result<DivisionData>;
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
        facebook_link AS "facebookLink"
      FROM dorms;
      `)) as Result<DormData>;
    return data.rows;
  } catch (e) {
    console.error("Error: ", e);
    return undefined;
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
//       `)) as Result<RoomData>;
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
    `)) as Result<ClassMapValue>;
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
  return async (checker:TableSyncInfo) => {
    try {
      if (checker.valid) {
        const data = await getLocalEntity();
        return data ?? [];
      }
      const fetchedData = await getJSONFetch<T[]>(`/api/${tableName}`);
      return fetchedData;
    } catch (e) {
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

export const getClasses = getEntity<ClassMapValue>("classes", getLocalClasses);

export function getEntityRooms(
  entityName: string,
  localTableRoomCheck: (id: number) => Promise<boolean>,
  getLocalTableRoom: (id: number) => Promise<RoomData[] | undefined>,
) {
  return async (id: number) => {
    try {
      const valid = await localTableRoomCheck(id);
      if (valid) {
        const data = await getLocalTableRoom(id);
        return data ?? [];
      }
      const fetchedData = await getJSONFetch<{ data: RoomData[] }>(
        `/api/rooms?${entityName}_id=${id}`,
      );
      return fetchedData.data;
    } catch (e) {
      return [];
    }
  };
}

export const getBuildingRooms = getEntityRooms(
  "building",
  checkLocalBuildingRoom,
  getLocalBuildingRooms,
);

export const getCollegeRooms = getEntityRooms(
  "college",
  checkLocalCollegeRoom,
  getLocalCollegeRooms,
);

export const getDivisionRooms = getEntityRooms(
  "division",
  checkLocalDivisionRoom,
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
  } catch (e) {
    return {
      directionCount: 0,
      totalRooms: 0,
    };
  }
}
