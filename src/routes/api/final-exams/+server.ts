import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { finalExamsTable, roomsTable } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const courseCode = url.searchParams.get('course_code');
	const roomCode = url.searchParams.get('room_code');
	const date = url.searchParams.get('date');
	const termIdRaw = url.searchParams.get('term_id');
	const termId = termIdRaw !== null && termIdRaw !== '' ? Number(termIdRaw) : undefined;
	if (termId !== undefined && !Number.isFinite(termId))
		throw error(400, { message: 'term_id must be a number' });

	const conditions = [];
	if (termId !== undefined) conditions.push(eq(finalExamsTable.termId, termId));
	const normalizedCourse = courseCode?.trim().toUpperCase();
	if (normalizedCourse) conditions.push(eq(finalExamsTable.courseCode, normalizedCourse));
	if (roomCode) conditions.push(eq(roomsTable.code, roomCode));
	if (date) conditions.push(eq(finalExamsTable.examDate, date));

	try {
		const data = await db
			.select({
				id: finalExamsTable.id,
				termId: finalExamsTable.termId,
				courseCode: finalExamsTable.courseCode,
				section: finalExamsTable.section,
				courseTitle: finalExamsTable.courseTitle,
				roomId: finalExamsTable.roomId,
				roomCode: roomsTable.code,
				examDate: finalExamsTable.examDate,
				startsAt: finalExamsTable.startsAt,
				endsAt: finalExamsTable.endsAt,
				source: finalExamsTable.source
			})
			.from(finalExamsTable)
			.leftJoin(roomsTable, eq(roomsTable.id, finalExamsTable.roomId))
			.where(conditions.length > 0 ? and(...conditions) : undefined)
			.orderBy(finalExamsTable.examDate, finalExamsTable.startsAt, finalExamsTable.courseCode);
		return json(data);
	} catch (e) {
		console.error(e);
		throw error(500, {
			message: 'Cannot query data for final exams'
		});
	}
};
