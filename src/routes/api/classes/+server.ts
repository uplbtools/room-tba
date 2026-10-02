import { error, json } from '@sveltejs/kit';
import { and, eq, ilike } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { classesTable, roomsTable } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const roomCode = url.searchParams.get('room_code');
	const courseCode = url.searchParams.get('course_code');
	const termIdRaw = url.searchParams.get('term_id');
	const termId = termIdRaw !== null && termIdRaw !== '' ? Number(termIdRaw) : undefined;
	if (termId !== undefined && !Number.isFinite(termId))
		throw error(400, { message: 'term_id must be a number' });

	const conditions = [];
	if (termId !== undefined) conditions.push(eq(classesTable.termId, termId));
	if (roomCode) conditions.push(eq(roomsTable.code, roomCode));
	const coursePrefix = courseCode?.trim();
	if (coursePrefix)
		conditions.push(ilike(classesTable.courseCode, `${coursePrefix.toUpperCase()}%`));

	try {
		const data = await db
			.select({
				id: classesTable.id,
				termId: classesTable.termId,
				roomId: classesTable.roomId,
				courseCode: classesTable.courseCode,
				roomCode: roomsTable.code,
				section: classesTable.section,
				type: classesTable.type,
				schedule: classesTable.schedule,
				directions: roomsTable.directions,
				courseTitle: classesTable.courseTitle
			})
			.from(classesTable)
			.leftJoin(roomsTable, eq(roomsTable.id, classesTable.roomId))
			.where(conditions.length > 0 ? and(...conditions) : undefined);
		return json(data);
	} catch (e) {
		console.error(e);
		throw error(400, {
			message: 'Cannot query data for classes'
		});
	}
};
