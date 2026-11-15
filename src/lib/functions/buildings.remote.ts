import { form, getRequestEvent, query } from '$app/server';
import { db } from '#lib/utils/db.js';
import { buildingsTable, editorHistoryTable, editProposalsTable, roomsTable } from '#lib/server/db/schema.js';
import { and, desc, eq, getTableColumns, sql } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { canPublishDirectly, sessionPublishingActor } from '#lib/admin/auth.js';
import { optionalEditorSession } from '#lib/admin/require-editor.js';
import { enforceProposalSubmitLimits } from '#lib/api/proposal-rate-limit.js';
import { clientIp } from '#lib/api/rate-limit.js';
import {
	DuplicateNameError,
	EditConflictError,
	updateBuilding
} from '#lib/services/admin/actions.js';
import {
	ProposalValidationError,
	submitProposal
} from '#lib/services/contribution/proposal-action.js';
import {
	emitProposalSubmitted,
	logNotificationEmitFailure
} from '#lib/utils/notifications/proposal-events.js';
import { BuildingProposalSchema, ListQuerySchema, RoomQueryPaginationSchema, TableIdSchema } from '#lib/schema/functions.js';

export const getMapBuildingsData = query(async () => {
	const rows = await db
		.select({
			id: buildingsTable.id,
			lon: buildingsTable.lon,
			lat: buildingsTable.lat,
			buildingName: buildingsTable.buildingName
		})
		.from(buildingsTable);
	return rows;
});

export const getBuildingById = query(TableIdSchema, async (id) => {

	// const [buildingData] = await db.select().from(buildingsTable).where(eq(buildingsTable.id, id));

	// const [row] = await db
	// 	.select({
	// 		editedBy: editorHistoryTable.editedBy,
	// 		createdAt: editorHistoryTable.createdAt
	// 	})
	// 	.from(editorHistoryTable)
	// 	.where(
	// 		and(
	// 			eq(editorHistoryTable.entityType, "building"),
	// 			eq(editorHistoryTable.entityId, id)
	// 		)
	// 	)
	// 	.orderBy(desc(editorHistoryTable.createdAt), desc(editorHistoryTable.id))
	// 	.limit(1);

	const [buildingData] = await db
		.select({
			...getTableColumns(buildingsTable),
			lastEditedBy: editorHistoryTable.editedBy,
			updatedAt: editorHistoryTable.createdAt
		})
		.from(buildingsTable)
		.leftJoin(
			editorHistoryTable, 
			and(
				eq(editorHistoryTable.entityId, buildingsTable.id),
				eq(editorHistoryTable.entityType, sql`'building'`)
			)
		)
		.where(eq(buildingsTable.id, id))
		.orderBy(desc(editorHistoryTable.createdAt));
	if (!buildingData) error(404, 'Not found');
	return { ...buildingData};
});

export const getBuildingsList = query(ListQuerySchema, async(offset = 0) => {
	const rows = await db
		.select()
		.from(buildingsTable)
		.orderBy(buildingsTable.buildingName)
		.limit(8)
		.offset(8 * offset);
	return rows;
})

export const addBuildingSuggestion = form(BuildingProposalSchema, async ({ meta, body }) => {
	const { cookies, request } = getRequestEvent();
	const session = await optionalEditorSession(cookies);
	const [current] = await db
		.select({ buildingName: buildingsTable.buildingName, directions: buildingsTable.directions })
		.from(buildingsTable)
		.where(eq(buildingsTable.id, meta.entityId));
	if (!current) error(404, 'Not found');
	const patch = {
		...(body.buildingName !== current.buildingName && { buildingName: body.buildingName }),
		...(body.directions !== (current.directions ?? '') && { directions: body.directions })
	};
	if (Object.keys(patch).length === 0) error(400, 'No changes to submit.');

	if (session && canPublishDirectly(session.role)) {
		try {
			await updateBuilding(
				meta.entityId,
				patch,
				meta.baseVersion,
				sessionPublishingActor(session)
			);
		} catch (err) {
			if (err instanceof EditConflictError)
				error(409, 'Someone else changed this building. Reload and try again.');
			if (err instanceof DuplicateNameError) error(409, err.message);
			throw err;
		}
		await getBuildingById(String(meta.entityId)).refresh();
		return { published: true };
	}

	if (enforceProposalSubmitLimits(session, clientIp(request)))
		error(429, 'Too many suggestions. Try again in a few minutes.');
	try {
		const proposal = await submitProposal({
			entityType: 'building',
			entityId: meta.entityId,
			baseVersion: meta.baseVersion,
			patch,
			submitterName: session?.displayName || session?.username || meta.submitterName,
			submitterUserId: session && session.id > 0 ? session.id : null
		});
		await emitProposalSubmitted(proposal, session?.id).catch((err) =>
			logNotificationEmitFailure('Notification emit failed', err)
		);
	} catch (err) {
		if (err instanceof ProposalValidationError) error(400, err.message);
		throw err;
	}
	return { published: false };
});

// export const approveBuilding
