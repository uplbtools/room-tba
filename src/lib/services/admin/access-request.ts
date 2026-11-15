import { and, desc, eq, sql } from 'drizzle-orm';
import type { SessionUser } from '#lib/admin/auth.js';
import { adminUsersTable, editorAccessRequestsTable } from '#lib/server/db/schema.js';
import { db } from '#lib/utils/db.js';
import { emitFeedbackSubmitted } from '#lib/utils/notifications/feedback-events.js';
import { logNotificationEmitFailure } from '#lib/utils/notifications/proposal-events.js';
import { AccountActionError, updateManagedUser } from './user.js';

export const ACCESS_REQUEST_MAX_LENGTH = 1000;

export type MyAccessRequest = {
	id: number;
	status: string;
	message: string;
	createdAt: string;
	decidedAt: string | null;
};

export type PendingAccessRequest = MyAccessRequest & {
	userId: number;
	username: string;
	displayName: string;
};

const requestColumns = {
	id: editorAccessRequestsTable.id,
	status: editorAccessRequestsTable.status,
	message: editorAccessRequestsTable.message,
	createdAt: editorAccessRequestsTable.createdAt,
	decidedAt: editorAccessRequestsTable.decidedAt
};

export async function getMyAccessRequest(userId: number): Promise<MyAccessRequest | null> {
	const [row] = await db
		.select(requestColumns)
		.from(editorAccessRequestsTable)
		.where(eq(editorAccessRequestsTable.userId, userId))
		.orderBy(desc(editorAccessRequestsTable.createdAt))
		.limit(1);
	return row ?? null;
}

export async function listPendingAccessRequests(): Promise<PendingAccessRequest[]> {
	const rows = await db
		.select({
			...requestColumns,
			userId: editorAccessRequestsTable.userId,
			username: adminUsersTable.username,
			displayName: adminUsersTable.displayName
		})
		.from(editorAccessRequestsTable)
		.innerJoin(adminUsersTable, eq(adminUsersTable.id, editorAccessRequestsTable.userId))
		.where(eq(editorAccessRequestsTable.status, 'pending'))
		.orderBy(desc(editorAccessRequestsTable.createdAt));
	return rows.map((row) => ({ ...row, displayName: row.displayName ?? row.username }));
}

export async function createAccessRequest(
	user: SessionUser,
	rawMessage: string
): Promise<MyAccessRequest> {
	if (user.role !== 'contributor') {
		throw new AccountActionError('Your account already has editor access.', 409);
	}
	const message = rawMessage.trim();
	if (message.length < 10) {
		throw new AccountActionError(
			'Tell the admins a little about what you want to edit (at least 10 characters).'
		);
	}
	if (message.length > ACCESS_REQUEST_MAX_LENGTH) {
		throw new AccountActionError(`Keep it under ${ACCESS_REQUEST_MAX_LENGTH} characters.`);
	}
	let created: typeof editorAccessRequestsTable.$inferSelect | undefined;
	try {
		[created] = await db
			.insert(editorAccessRequestsTable)
			.values({ userId: user.id, message })
			.returning();
	} catch (error) {
		const code =
			(error as { code?: string })?.code ?? (error as { cause?: { code?: string } })?.cause?.code;
		if (code === '23505') {
			throw new AccountActionError('You already have a request waiting for an admin.', 409);
		}
		throw error;
	}
	if (!created) throw new AccountActionError("Couldn't save the request.", 500);
	await emitFeedbackSubmitted({
		feedbackId: created.id,
		message: `Editor access request from ${user.displayName || user.username} (${user.username}): ${message}`,
		contact: user.username,
		screen: '/map',
		appVersion: null,
		wasOnline: null
	}).catch((err) => logNotificationEmitFailure('Access request notification failed', err));
	return { ...created, status: 'pending', decidedAt: null };
}

/** Approving grants the editor role to a contributor. */
export async function decideAccessRequest(
	id: number,
	decision: 'approved' | 'declined',
	admin: SessionUser
): Promise<{ userId: number; username: string }> {
	const [row] = await db
		.update(editorAccessRequestsTable)
		.set({ status: decision, decidedBy: admin.id, decidedAt: sql`now()` })
		.where(
			and(eq(editorAccessRequestsTable.id, id), eq(editorAccessRequestsTable.status, 'pending'))
		)
		.returning({ userId: editorAccessRequestsTable.userId });
	if (!row) throw new AccountActionError('That request was already handled.', 409);
	const [user] = await db
		.select({ username: adminUsersTable.username, role: adminUsersTable.role })
		.from(adminUsersTable)
		.where(eq(adminUsersTable.id, row.userId));
	if (decision === 'approved' && user?.role === 'contributor') {
		await updateManagedUser(row.userId, { role: 'editor' });
	}
	return { userId: row.userId, username: user?.username ?? `#${row.userId}` };
}
