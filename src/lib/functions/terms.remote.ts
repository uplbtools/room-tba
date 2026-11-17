import { query } from '$app/server';
import { classesTable, termsTable } from '#lib/server/db/schema.js';
import { db } from '#lib/utils/db.js';
import { desc, eq, getTableColumns, sql } from 'drizzle-orm';

/** Every term with its class count, newest first. */
export const getTerms = query(async () => {
	const rows = await db
		.select({
			...getTableColumns(termsTable),
			classCount: sql<number>`count(${classesTable.id})::int`
		})
		.from(termsTable)
		.leftJoin(classesTable, eq(classesTable.termId, termsTable.id))
		.groupBy(termsTable.id)
		.orderBy(desc(termsTable.sortOrder), desc(termsTable.id));
	return rows;
});
