import { error, json } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.js';
import { editorHistoryTable } from '#lib/server/db/schema.js';
import type { RequestHandler } from './$types';

// Inlined from astro/src/lib/editor/entity-attribution.ts.
const ATTRIBUTABLE_ENTITY_TYPES = new Set([
	'building',
	'room',
	'dorm',
	'college',
	'division',
	'event'
]);

type EntityAttributionRequest =
	| {
			ok: true;
			entityType: string;
			entityId: number;
	  }
	| {
			ok: false;
			status: number;
			error: string;
	  };

function parseEntityAttributionRequest(params: URLSearchParams): EntityAttributionRequest {
	const entityType = params.get('entityType') ?? '';
	const entityId = Number(params.get('entityId'));

	if (!ATTRIBUTABLE_ENTITY_TYPES.has(entityType)) {
		return { ok: false, status: 400, error: 'Unsupported entity type.' };
	}
	if (!Number.isInteger(entityId) || entityId < 1) {
		return { ok: false, status: 400, error: 'Invalid entity ID.' };
	}

	return { ok: true, entityType, entityId };
}

export const GET: RequestHandler = async ({ url }) => {
	const parsed = parseEntityAttributionRequest(url.searchParams);
	if (!parsed.ok) {
		return json({ error: parsed.error }, { status: parsed.status });
	}

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
