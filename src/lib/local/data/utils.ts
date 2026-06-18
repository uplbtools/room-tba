import { Result } from "pg";
import {
  BuildingData,
  ClassMapValue,
  CollegeData,
  DivisionData,
  DormData,
  RoomData,
} from "../../types";
import { getDB } from "./pgliteDB";
import { localTableSyncCheck, updateSyncKeyFromLs } from "./sync";
import { syncToastStore } from "../../store.svelte";

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

export async function getLocalRooms(): Promise<RoomData[] | undefined> {
  try {
    const localDB = getDB();

    await localDB.waitReady;
    const data = (await localDB.query(`
      SELECT
        r.room_code AS code,
        r.directions AS directions,
        json_build_object('name',b.building_name, 'lat', b.lat, 'lon', b.lon, 'directions', b.directions ) as building,
        c.college_name as "collegeName",
        d.division_name as "divisionName",
        r.building_id as "buildingId",
        r.college_id as "collegeId",
        r.division_id as "divisionId"
      FROM rooms AS r
      LEFT JOIN buildings AS b ON b.id = r.building_id
      LEFT JOIN colleges as c ON c.id = r.college_id
      LEFT JOIN divisions AS d ON d.id = r.division_id;
      `)) as Result<RoomData>;
    return data.rows;
  } catch (e) {
    console.error("Error: ", e);
    return undefined;
  }
}

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

export async function syncBuildings(remoteBuildings: BuildingData[]) {
  const res = await localTableSyncCheck("buildings");
  if (res.valid) return;
  const localDB = getDB();

  await localDB.waitReady;
  syncToastStore.startBuildingsSync(remoteBuildings.length);
  for (const b of remoteBuildings) {
    try {
      await localDB.query(
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
      syncToastStore.updateCollegesSync();
    } catch (e) {
      console.error(e);
    }
  }
  updateSyncKeyFromLs("buildings", res.newKey ?? "");
}

export async function syncColleges(remoteColleges: CollegeData[]) {
  const res = await localTableSyncCheck("colleges");
  if (res.valid) return;

  const localDB = getDB();

  await localDB.waitReady;
  syncToastStore.startCollegesSync(remoteColleges.length);
  for (const college of remoteColleges) {
    try {
      await localDB.query(
        `
        INSERT INTO colleges (id, college_name)
        VALUES ($1, $2)
        ON CONFLICT (id) DO UPDATE SET
        id = EXCLUDED.id,
        college_name = EXCLUDED.college_name;
        `,
        [college.id, college.collegeName],
      );
      syncToastStore.updateCollegesSync();
    } catch (e) {
      console.error(e);
    }
  }

  updateSyncKeyFromLs("colleges", res.newKey ?? "");
}

export async function syncDivisions(remoteDivisions: DivisionData[]) {
  const res = await localTableSyncCheck("divisions");
  if (res.valid) return;

  const localDB = getDB();

  await localDB.waitReady;
  syncToastStore.startDivisionsSync(remoteDivisions.length);
  for (const division of remoteDivisions) {
    try {
      await localDB.query(
        `
        INSERT INTO divisions (id, division_name)
        VALUES ($1, $2)
        ON CONFLICT (id) DO UPDATE SET
        id = EXCLUDED.id,
        division_name = EXCLUDED.division_name;
        `,
        [division.id, division.divisionName],
      );
      syncToastStore.updateDivisionsSync();
    } catch (e) {
      console.error(e);
    }
  }
  updateSyncKeyFromLs("divisions", res.newKey ?? "");
}

export async function syncRooms(remoteRooms: RoomData[]) {
  const res = await localTableSyncCheck("rooms");
  if (res.valid) return;

  const localDB = getDB();

  await localDB.waitReady;
  for (const b of remoteRooms) {
    try {
      await localDB.query(
        `
        INSERT INTO rooms (id, room_code, directions, building_id, college_id, division_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
        id = EXCLUDED.id,
        room_code = EXCLUDED.room_code,
        directions = EXCLUDED.directions,
        building_id = EXCLUDED.building_id,
        college_id = EXCLUDED.college_id,
        division_id = EXCLUDED.division_id;
        `,
        [b.id, b.code, b.directions, b.buildingId, b.collegeId, b.divisionId],
      );
    } catch (e) {
      console.error(e);
    }
  }

  updateSyncKeyFromLs("rooms", res.newKey ?? "");
}

export async function syncDorms(remoteDorms: DormData[]) {
  const res = await localTableSyncCheck("dorms");
  if (res.valid) return;

  const localDB = getDB();

  await localDB.waitReady;
  syncToastStore.startDormsSync(remoteDorms.length);
  for (const b of remoteDorms) {
    try {
      await localDB.query(
        `
        INSERT INTO dorms (id, dorm_name, short_name, lat, lon, gender, capacity, managing_office, contact_email, amenities, osm_link, description, is_up_managed, price_range, contact_phone, facebook_link)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
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
        facebook_link = EXCLUDED.facebook_link;
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
        ],
      );
      syncToastStore.updateDormsSync();
    } catch (e) {
      console.error(e);
    }
  }
  updateSyncKeyFromLs("dorms", res.newKey ?? "");
}
