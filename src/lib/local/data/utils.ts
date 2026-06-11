import { Result } from "pg";
import {
  BuildingData,
  ClassMapValue,
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
      await db.query(
        `
        INSERT INTO buildings (id, building_name, lon, lat, directions)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
        id = EXCLUDED.id,
        building_name = EXCLUDED.building_name,
        lon = EXCLUDED.lon,
        lat = EXCLUDED.lat,
        directions = EXCLUDED.directions;
        `,
        [b.id, b.buildingName, b.lon, b.lat, b.directions],
      );
    } catch (e) {
      console.error(e);
    }
  }
}

export async function syncColleges(remoteColleges: CollegeData[]) {
  const db = await getDB();
  for (const college of remoteColleges) {
    try {
      await db.query(
        `
        INSERT INTO colleges (id, college_name)
        VALUES ($1, $2)
        ON CONFLICT (id) DO UPDATE SET
        id = EXCLUDED.id,
        college_name = EXCLUDED.college_name;
        `,
        [college.id, college.collegeName],
      );
    } catch (e) {
      console.error(e);
    }
  }
}

export async function syncDivisions(remoteDivisions: DivisionData[]) {
  const db = await getDB();
  for (const division of remoteDivisions) {
    try {
      await db.query(
        `
        INSERT INTO divisions (id, division_name)
        VALUES ($1, $2)
        ON CONFLICT (id) DO UPDATE SET
        id = EXCLUDED.id,
        division_name = EXCLUDED.division_name;
        `,
        [division.id, division.divisionName],
      );
    } catch (e) {
      console.error(e);
    }
  }
}

export async function syncClasses(remoteClasses: ClassMapValue[]) {
  const db = await getDB();
  for (const classData of remoteClasses) {
    try {
      await db.query(
        `
        INSERT INTO classes (id, course_code, section, type, schedule, room_id, course_title, term_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
        id = EXCLUDED.id,
        course_code = EXCLUDED.course_code,
        section = EXCLUDED.section,
        type = EXCLUDED.type,
        schedule = EXCLUDED.schedule,
        room_id = EXCLUDED.room_id,
        course_title = EXCLUDED.course_title,
        term_id = EXCLUDED.term_id
        `,
        [
          classData.id,
          classData.courseCode,
          classData.section,
          classData.type,
          classData.schedule,
          classData.roomId,
          classData.courseTitle,
          classData.termId,
        ],
      );
    } catch (e) {
      console.error(e);
    }
  }
}

export async function syncRooms(remoteRooms: RoomData[]) {
  const db = await getDB();
  for (const b of remoteRooms) {
    try {
      await db.query(
        `
        INSERT INTO rooms (id, room_code, directions, building_id, college_id, division_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
        id = EXCLUDED.id,
        room_code = EXCLUDED.room_code,
        directions = EXCLUDED.directions,
        building_id = EXCLUDED.building_id,
        college_id = EXCLUDED.college_id,
        division_id = EXCLUDED.division_id
        `,
        [b.id, b.code, b.directions, b.buildingId, b.collegeId, b.divisionId],
      );
    } catch (e) {
      console.error(e);
    }
  }
}

export async function syncDorms(remoteDorms: DormData[]) {
  const db = await getDB();
  for (const b of remoteDorms) {
    try {
      await db.query(
        `
        INSERT INTO dorms (id, dorm_name, short_name, lat, lon, gender, capacity, managing_office, contact_email, amenities, osm_link, description, is_up_managed, price_range, contact_phone, facebook_link)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $0, $11, $12, $13, $14, $15, $16)
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
          b.amenities,
          b.osmLink,
          b.description,
          b.isUpManaged,
          b.priceRange,
          b.contactPhone,
          b.facebookLink,
        ],
      );
    } catch (e) {
      console.error(e);
    }
  }
}

export async function getLocalAppData(): Promise<DBData> {
  return {
    buildings: null,
    colleges: null,
    classesMap: null,
    directionCount: null,
    divisions: null,
    dorms: null,
    rooms: null,
    totalRooms: null,
  };
}
