import { desc, eq, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.js';
import { classesTable, termsTable } from '#lib/server/db/schema.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	// Inlined from astro src/lib/services/term-service.ts getAllTerms:
	// returns [] if the terms table is missing so callers degrade gracefully.
	try {
		const rows = await db
			.select({
				id: termsTable.id,
				label: termsTable.label,
				schoolYear: termsTable.schoolYear,
				semester: termsTable.semester,
				startsOn: termsTable.startsOn,
				endsOn: termsTable.endsOn,
				isDefault: termsTable.isDefault,
				isActive: termsTable.isActive,
				sortOrder: termsTable.sortOrder,
				version: termsTable.version,
				updatedAt: termsTable.updatedAt,
				classesImportedAt: termsTable.classesImportedAt,
				classCount: sql<number>`count(${classesTable.id})::int`
			})
			.from(termsTable)
			.leftJoin(classesTable, eq(classesTable.termId, termsTable.id))
			.groupBy(termsTable.id)
			.orderBy(desc(termsTable.sortOrder), desc(termsTable.id));
		return new Response(JSON.stringify(rows));
	} catch (e) {
		console.error('Failed to fetch terms:', e);
		return new Response(JSON.stringify([]));
	}
};
