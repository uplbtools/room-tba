import { error } from '@sveltejs/kit';
import { desc, inArray, sql } from 'drizzle-orm';
import { getRequestEvent, query } from '$app/server';
import { canReviewProposals } from '#lib/admin/roles.js';
import { optionalEditorSession } from '#lib/admin/require-editor.js';
import { editorHistoryTable, notificationOutboxTable } from '#lib/server/db/schema.js';
import { listPendingAccessRequests } from '#lib/services/admin/access-request.js';
import { countPendingProposals } from '#lib/services/contribution/proposal-action.js';
import { listDigestRecipients } from '#lib/services/email/digest.js';
import { db } from '#lib/utils/db.js';

export const getStaffDashboard = query(async () => {
	const session = await optionalEditorSession(getRequestEvent().cookies);
	if (!session || !canReviewProposals(session.role)) error(403, 'Only editors can see this.');
	const [pendingReviews, recent, recipients, outbox, accessRequests] = await Promise.all([
		countPendingProposals(),
		db
			.select({
				id: editorHistoryTable.id,
				entityType: editorHistoryTable.entityType,
				action: editorHistoryTable.action,
				editedBy: editorHistoryTable.editedBy,
				summary: editorHistoryTable.summary,
				createdAt: editorHistoryTable.createdAt
			})
			.from(editorHistoryTable)
			.orderBy(desc(editorHistoryTable.createdAt))
			.limit(8),
		listDigestRecipients(),
		db
			.select({ status: notificationOutboxTable.status, count: sql<number>`count(*)::int` })
			.from(notificationOutboxTable)
			.where(inArray(notificationOutboxTable.status, ['pending', 'dead']))
			.groupBy(notificationOutboxTable.status),
		session.role === 'admin' ? listPendingAccessRequests() : null
	]);
	const queued = (status: string) => outbox.find((row) => row.status === status)?.count ?? 0;
	return {
		pendingReviews,
		recentActivity: recent.map((row) => ({
			...row,
			editedBy: row.editedBy.replace(/^room-tba-publisher:\d+:/, '')
		})),
		digest: {
			recipientCount: recipients.length,
			youReceiveIt: recipients.some((row) => row.id === session.id)
		},
		outbox: { pending: queued('pending'), dead: queued('dead') },
		accessRequests: accessRequests?.map(({ id, username, displayName, message, createdAt }) => ({
			id,
			username,
			displayName,
			message,
			createdAt
		}))
	};
});
