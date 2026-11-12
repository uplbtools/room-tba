import { error, type Cookies } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { adminUsersTable } from '#lib/server/db/schema.js';
import { db } from '#lib/utils/db.js';
import {
	ADMIN_COOKIE_NAME,
	canPublishDirectly,
	canReviewProposals,
	getSessionUser,
	sessionPublishingActor,
	sessionEditedBy,
	type SessionUser
} from './auth';

export function getEditorSession(cookies: Cookies): SessionUser | null {
	const cookie = cookies.get(ADMIN_COOKIE_NAME);
	return getSessionUser(cookie);
}

type EditorSessionOptions = {
	requirePublish?: boolean;
	requireReview?: boolean;
	requireAdmin?: boolean;
};

/**
 * Re-check the stateless cookie against the DB so deactivation/demotion
 * takes effect immediately instead of after cookie expiry (7 days). One
 * primary-key lookup per privileged request; returns the CURRENT role.
 */
async function revalidateSession(session: SessionUser): Promise<SessionUser | null> {
	try {
		const [row] = await db
			.select({
				role: adminUsersTable.role,
				displayName: adminUsersTable.displayName
			})
			.from(adminUsersTable)
			.where(and(eq(adminUsersTable.id, session.id), eq(adminUsersTable.isActive, true)))
			.limit(1);
		if (!row) return null;
		return {
			...session,
			displayName: row.displayName ?? session.displayName,
			role: row.role ?? session.role
		};
	} catch (error) {
		// DB down: fail closed for privileged routes.
		console.error('Session revalidation failed:', error);
		return null;
	}
}

export async function editorSessionOrUnauthorized(
	cookies: Cookies,
	options: EditorSessionOptions = {}
) {
	const cookieSession = getEditorSession(cookies);
	if (!cookieSession) {
		error(401, "Unauthorized");
	}
	const session = await revalidateSession(cookieSession);
	if (!session) {
		error(401, "Unauthorized");
	}
	if (options.requirePublish && !canPublishDirectly(session.role)) {
		error(403, "Your account can suggest edits but cannot publish directly.")
	}
	if (options.requireReview && !canReviewProposals(session.role)) {
		error(403, "Your account cannot review edit proposals.")
	}
	if (options.requireAdmin && session.role !== 'admin') {
		error(403, "Your account cannot manage other users.")
	}
	return {
		session,
		editedBy: options.requirePublish ? sessionPublishingActor(session) : sessionEditedBy(session),
		role: session.role
	};
}
