import { Result } from "pg";
import {
  BuildingData,
  CollegeData,
  DivisionData,
  DormData,
  RoomData,
  RoomPosition,
} from "../../types";
import { getDB } from "./pgliteDB";
import { DBData } from "../../context";


export async function getLocalBuildings(): Promise<BuildingData[] | undefined> {
  try {
    const pgliteDB = await getDB();
    const data = (await pgliteDB.query(`
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
    const pgliteDB = await getDB();
    const data = (await pgliteDB.query(`
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
    const pgliteDB = await getDB();
    const data = (await pgliteDB.query(`
        SELECT college_name AS "collegeName", id FROM colleges;
      `)) as Result<DivisionData>;
    return data.rows;
  } catch (e) {
    console.error("Error: ", e);
    return undefined;
  }
}

export async function getLocalDorms(): Promise<DormData[] | undefined> {
  try {
    const pgliteDB = await getDB();
    const data = (await pgliteDB.query(`
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

// }

export async function getRoomPosition(
  roomId: number,
): Promise<RoomPosition | null | undefined> {
  try {
    const pgliteDB = await getDB();
    const data = (await pgliteDB.query(`
        SELECT
          id,
          floor,
          pos_x AS "posX",
          pos_y AS "posY",
          updated_at AS "updatedAt",
          room_id AS "room_id"
        FROM room_positions
        WHERE room_id = ${roomId}
      `)) as Result<RoomPosition>;
    return data.rows.length != 0 ? data.rows[0] : null;
  } catch (e) {
    console.error("Error: ", e);
    return undefined;
  }
}

export async function syncBuildings(remoteBuildings: BuildingData[]) {
  const db = await getDB();
  for (const b of remoteBuildings) {
    try {
      await db.query(`
        INSERT INTO buildings (id, building_name, lon, lat, directions)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
        id = EXCLUDED.id,
        building_name = EXCLUDED.building_name,
        lon = EXCLUDED.lon,
        lat = EXCLUDED.lat,
        directions = EXCLUDED.directions;
        `, [b.id, b.buildingName, b.lon, b.lat, b.directions]);
    } catch (e) {
      console.error(e);
    }
  }
}

export async function syncAllData(data: DBData) {

}
