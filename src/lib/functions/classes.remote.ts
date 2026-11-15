import { query } from '$app/server';
import { classesTable, roomsTable } from '#lib/server/db/schema.js';
import { db } from '#lib/utils/db.js';
import { escapeLikePattern } from '#lib/utils/like-escape.js';
import { and, eq, ilike } from 'drizzle-orm';
import * as v from 'valibot';

const classFields = {
	id: classesTable.id,
	termId: classesTable.termId,
	courseCode: classesTable.courseCode,
	courseTitle: classesTable.courseTitle,
	section: classesTable.section,
	type: classesTable.type,
	schedule: classesTable.schedule,
	roomId: classesTable.roomId,
	roomCode: roomsTable.code,
	directions: roomsTable.directions
};

export const getClassesByCourseCode = query(
	v.object({
		termId: v.pipe(v.number(), v.integer()),
		courseCode: v.pipe(v.string(), v.trim(), v.minLength(1))
	}),
	async ({ termId, courseCode }) => {
		const rows = await db
			.select(classFields)
			.from(classesTable)
			.leftJoin(roomsTable, eq(roomsTable.id, classesTable.roomId))
			.where(
				and(
					eq(classesTable.termId, termId),
					ilike(classesTable.courseCode, `${escapeLikePattern(courseCode)}%`)
				)
			)
			.orderBy(classesTable.courseCode, classesTable.section)
			.limit(2000);
		return rows;
	}
);

export const getClassesByRoomId = query(
	v.object({
		termId: v.pipe(v.number(), v.integer()),
		roomId: v.pipe(v.number(), v.integer())
	}),
	async ({ termId, roomId }) => {
		return db
			.select(classFields)
			.from(classesTable)
			.leftJoin(roomsTable, eq(roomsTable.id, classesTable.roomId))
			.where(and(eq(classesTable.termId, termId), eq(classesTable.roomId, roomId)))
			.orderBy(classesTable.courseCode, classesTable.section);
	}
);
