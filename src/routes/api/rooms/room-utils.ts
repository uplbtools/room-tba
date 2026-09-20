import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { buildingsTable, collegesTable, divisionsTable, roomsTable } from '$lib/server/db/schema';
import type { Room } from '$lib/utils/types';

/** Escape LIKE wildcards so user input matches literally. */
function escapeLikePattern(value: string): string {
	return value.replace(/[\\%_]/g, '\\$&');
}

export async function getRoomByCode(code: string) {
	try {
		const normalizedCode = code.toUpperCase();
		const data = await db
			.select({
				id: roomsTable.id,
				code: roomsTable.roomCode,
				fullName: roomsTable.fullName,
				directions: roomsTable.directions,
				building: {
					name: buildingsTable.buildingName,
					lat: buildingsTable.lat,
					lon: buildingsTable.lon,
					directions: buildingsTable.directions
				},
				collegeName: collegesTable.collegeName,
				divisionName: divisionsTable.divisionName,
				buildingId: roomsTable.buildingId,
				collegeId: roomsTable.collegeId,
				divisionId: roomsTable.divisionId,
				imageUrl: roomsTable.imageUrl,
				category: roomsTable.category,
				version: roomsTable.version,
				updatedAt: roomsTable.updatedAt
			})
			.from(roomsTable)
			.leftJoin(buildingsTable, eq(buildingsTable.id, roomsTable.buildingId))
			.leftJoin(collegesTable, eq(collegesTable.id, roomsTable.collegeId))
			.leftJoin(divisionsTable, eq(divisionsTable.id, roomsTable.divisionId))
			.where(sql`upper(${roomsTable.roomCode}) = ${normalizedCode}`);
		if (data.length === 0 || typeof data[0] === 'undefined') return null;
		return data[0];
	} catch (e) {
		console.error('Error: ', e);
		throw new Error('Failed to fetch rooms', { cause: e });
	}
}

export async function searchRooms(searchString: string) {
	try {
		const escaped = escapeLikePattern(searchString);
		const data = await db
			.select({
				value: roomsTable.roomCode,
				fullName: roomsTable.fullName,
				id: roomsTable.id
			})
			.from(roomsTable)
			.leftJoin(buildingsTable, eq(buildingsTable.id, roomsTable.buildingId))
			.leftJoin(collegesTable, eq(collegesTable.id, roomsTable.collegeId))
			.leftJoin(divisionsTable, eq(divisionsTable.id, roomsTable.divisionId))
			// Callers upper-case the query, so match both columns case-insensitively:
			// full names are mixed case ("DSDS Main Lecture Hall") (#875).
			.where(
				sql`upper(${roomsTable.roomCode}) LIKE ${`%${escaped.toUpperCase()}%`}
          OR upper(${roomsTable.fullName}) LIKE ${`%${escaped.toUpperCase()}%`}`
			)
			.limit(6);
		if (data.length === 0) return null;
		return data;
	} catch (e) {
		console.error('Error: ', e);
		throw new Error('Failed to fetch rooms', { cause: e });
	}
}

export async function getBuildingRooms(buildingId: number): Promise<Room[]> {
	try {
		const data = await db
			.select({
				id: roomsTable.id,
				code: roomsTable.roomCode,
				fullName: roomsTable.fullName,
				directions: roomsTable.directions,
				building: {
					name: buildingsTable.buildingName,
					lat: buildingsTable.lat,
					lon: buildingsTable.lon,
					directions: buildingsTable.directions
				},
				collegeName: collegesTable.collegeName,
				divisionName: divisionsTable.divisionName,
				buildingId: roomsTable.buildingId,
				collegeId: roomsTable.collegeId,
				divisionId: roomsTable.divisionId,
				imageUrl: roomsTable.imageUrl,
				category: roomsTable.category,
				version: roomsTable.version,
				updatedAt: roomsTable.updatedAt
			})
			.from(roomsTable)
			.leftJoin(buildingsTable, eq(buildingsTable.id, roomsTable.buildingId))
			.leftJoin(collegesTable, eq(collegesTable.id, roomsTable.collegeId))
			.leftJoin(divisionsTable, eq(divisionsTable.id, roomsTable.divisionId))
			.where(eq(roomsTable.buildingId, buildingId));
		return data;
	} catch (e) {
		console.error('Error: ', e);
		throw new Error('Failed to fetch rooms', { cause: e });
	}
}
export async function getCollegeRooms(collegeId: number): Promise<Room[]> {
	try {
		const data = await db
			.select({
				id: roomsTable.id,
				code: roomsTable.roomCode,
				fullName: roomsTable.fullName,
				directions: roomsTable.directions,
				building: {
					name: buildingsTable.buildingName,
					lat: buildingsTable.lat,
					lon: buildingsTable.lon,
					directions: buildingsTable.directions
				},
				collegeName: collegesTable.collegeName,
				divisionName: divisionsTable.divisionName,
				buildingId: roomsTable.buildingId,
				collegeId: roomsTable.collegeId,
				divisionId: roomsTable.divisionId,
				imageUrl: roomsTable.imageUrl,
				category: roomsTable.category,
				version: roomsTable.version,
				updatedAt: roomsTable.updatedAt
			})
			.from(roomsTable)
			.leftJoin(buildingsTable, eq(buildingsTable.id, roomsTable.buildingId))
			.leftJoin(collegesTable, eq(collegesTable.id, roomsTable.collegeId))
			.leftJoin(divisionsTable, eq(divisionsTable.id, roomsTable.divisionId))
			.where(eq(roomsTable.collegeId, collegeId));
		return data;
	} catch (e) {
		console.error('Error: ', e);
		throw new Error('Failed to fetch rooms', { cause: e });
	}
}
export async function getDivisionRooms(divisionId: number): Promise<Room[]> {
	try {
		const data = await db
			.select({
				id: roomsTable.id,
				code: roomsTable.roomCode,
				fullName: roomsTable.fullName,
				directions: roomsTable.directions,
				building: {
					name: buildingsTable.buildingName,
					lat: buildingsTable.lat,
					lon: buildingsTable.lon,
					directions: buildingsTable.directions
				},
				collegeName: collegesTable.collegeName,
				divisionName: divisionsTable.divisionName,
				buildingId: roomsTable.buildingId,
				collegeId: roomsTable.collegeId,
				divisionId: roomsTable.divisionId,
				imageUrl: roomsTable.imageUrl,
				category: roomsTable.category,
				version: roomsTable.version,
				updatedAt: roomsTable.updatedAt
			})
			.from(roomsTable)
			.leftJoin(buildingsTable, eq(buildingsTable.id, roomsTable.buildingId))
			.leftJoin(collegesTable, eq(collegesTable.id, roomsTable.collegeId))
			.leftJoin(divisionsTable, eq(divisionsTable.id, roomsTable.divisionId))
			.where(eq(roomsTable.divisionId, divisionId));

		return data;
	} catch (e) {
		console.error('Error: ', e);
		throw new Error('Failed to fetch rooms', { cause: e });
	}
}
