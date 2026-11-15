import { query } from '$app/server';
import { finalExamsTable, roomsTable } from '#lib/server/db/schema.js';
import { db } from '#lib/utils/db.js';
import { and, eq } from 'drizzle-orm';
import * as v from 'valibot';

export const getFinalExams = query(
	v.object({
		termId: v.pipe(v.number(), v.integer()),
		courseCode: v.optional(v.pipe(v.string(), v.trim(), v.toUpperCase(), v.minLength(1))),
		roomCode: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1)))
	}),
	async ({ termId, courseCode, roomCode }) => {
		return db
			.select({
				id: finalExamsTable.id,
				termId: finalExamsTable.termId,
				courseCode: finalExamsTable.courseCode,
				section: finalExamsTable.section,
				courseTitle: finalExamsTable.courseTitle,
				roomId: finalExamsTable.roomId,
				roomCode: roomsTable.roomCode,
				examDate: finalExamsTable.examDate,
				startsAt: finalExamsTable.startsAt,
				endsAt: finalExamsTable.endsAt,
				source: finalExamsTable.source
			})
			.from(finalExamsTable)
			.leftJoin(roomsTable, eq(roomsTable.id, finalExamsTable.roomId))
			.where(
				and(
					eq(finalExamsTable.termId, termId),
					courseCode ? eq(finalExamsTable.courseCode, courseCode) : undefined,
					roomCode ? eq(roomsTable.roomCode, roomCode) : undefined
				)
			)
			.orderBy(finalExamsTable.examDate, finalExamsTable.startsAt, finalExamsTable.courseCode);
	}
);
