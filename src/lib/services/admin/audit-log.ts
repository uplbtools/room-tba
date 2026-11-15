import type { SessionUser } from '#lib/admin/auth.js';
import { adminAuditLogTable } from '#lib/server/db/schema.js';
import { db } from '#lib/utils/db.js';

export type AuditAction =
	| 'login.success'
	| 'login.failure'
	| 'user.created'
	| 'user.role_changed'
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
