import { error, json } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { editorHistoryTable } from '$lib/server/db/schema';
import * as v from 'valibot';
import { EntityAttributionQuery } from '$lib/schema/editor';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const query = v.safeParse(EntityAttributionQuery, Object.fromEntries(url.searchParams), {
		abortEarly: true
	});
	if (!query.success) {
		return json({ error: query.issues[0].message }, { status: 400 });
	}
	const parsed = query.output;

	try {
		const [row] = await db
			.select({
				editedBy: editorHistoryTable.editedBy,
				createdAt: editorHistoryTable.createdAt
			})
			.from(editorHistoryTable)
			.where(
				and(
					eq(editorHistoryTable.entityType, parsed.entityType),
					eq(editorHistoryTable.entityId, parsed.entityId)
				)
			)
			.orderBy(desc(editorHistoryTable.createdAt), desc(editorHistoryTable.id))
			.limit(1);

		return json({
			attribution: row ?? null
		});
	} catch (e) {
		console.error(e);
		throw error(500, {
			message: 'Cannot query editor attribution'
		});
	}
};
