import { Result } from "pg";
import { BuildingData, CollegeData, DivisionData } from "../../types";
import { getDB } from "./pgliteDB";

export async function getLocalBuildings(): Promise<BuildingData[]> {
  try {
    const pgliteDB = await getDB();
    const data = (await pgliteDB.query(`
      SELECT building_name as "buildingName", lon, lat, id, directions from buildings
      `)) as Result<BuildingData>;
    return data.rows;
  } catch (e) {
    console.error(e);
    throw new Error("Failed to fetch local buildings");
  }
}

export async function getLocalColleges(): Promise<CollegeData[]> {
  try {
    const pgliteDB = await getDB();
    const data = (await pgliteDB.query(`
      SELECT college_name as "collegeName", id from colleges;
      `)) as Result<CollegeData>;
    return data.rows;
  } catch (e) {
    console.error(e);
    throw new Error("Failed to fetch local buildings");
  }
}

export async function getLocalDivisions(): Promise<DivisionData[]> {
  try {
    const pgliteDB = await getDB();
    const data = (await pgliteDB.query(`
      SELECT college_name as "collegeName", id from colleges;
      `)) as Result<DivisionData>;
    return data.rows;
  } catch (e) {
    console.error(e);
    throw new Error("Failed to fetch local buildings");
  }
}
