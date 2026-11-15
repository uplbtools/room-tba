import { desc, lt } from 'drizzle-orm';
import type { SessionUser } from '#lib/admin/auth.js';
import { adminAuditLogTable } from '#lib/server/db/schema.js';
import { db } from '#lib/utils/db.js';

export type AuditAction =
	| 'login.success'
	| 'login.failure'
	| 'user.created'
	| 'user.invited'
	| 'user.invite_accepted'
	| 'user.role_changed'
	| 'access.requested'
	| 'access.approved'
	| 'access.declined'
	| 'user.activated'
	| 'user.deactivated'
	| 'password.reset_requested'
	| 'password.reset_completed'
	| 'password.changed'
	| 'proposal.approved'
	| 'proposal.rejected'
	| 'proposal.changes_requested';

export type AuditEntry = {
	action: AuditAction;
	actor?: Pick<SessionUser, 'id' | 'username'> | null;
	/** For actions with no signed-in actor, e.g. a failed login's username. */
	actorLabel?: string | null;
	targetUserId?: number | null;
	targetLabel?: string | null;
	detail?: Record<string, unknown> | null;
	ip?: string | null;
};

/** Best effort: the action already happened, so a failed write is only logged. */
export async function recordAudit(entry: AuditEntry): Promise<void> {
	try {
		await db.insert(adminAuditLogTable).values({
			action: entry.action,
			actorUserId: entry.actor?.id ?? null,
			actorLabel: entry.actor?.username ?? entry.actorLabel ?? null,
			targetUserId: entry.targetUserId ?? null,
			targetLabel: entry.targetLabel ?? null,
			detail: entry.detail ?? null,
			ip: entry.ip ?? null
		});
	} catch (error) {
		console.error(`Audit log write failed (${entry.action}):`, error);
	}
}

const AUDIT_PAGE_SIZE = 50;

/** Newest first. `before` is the last id of the previous page. */
export async function listAuditLog(before: number | null) {
	const rows = await db
		.select()
		.from(adminAuditLogTable)
		.where(before ? lt(adminAuditLogTable.id, before) : undefined)
		.orderBy(desc(adminAuditLogTable.id))
		.limit(AUDIT_PAGE_SIZE + 1);
	const entries = rows.slice(0, AUDIT_PAGE_SIZE);
	return {
		entries,
		nextBefore: rows.length > AUDIT_PAGE_SIZE ? (entries.at(-1)?.id ?? null) : null
	};
}
