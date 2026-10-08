import { desc, lt } from "drizzle-orm";
import { adminAuditLogTable } from "@drizzle/auth-ops-schema";
import { db } from "@lib/db";
import { isMissingSchemaError } from "@lib/server/missing-schema";
import type { SessionUser } from "@lib/admin/auth";

/** Every action the audit log records (auth audit item 18). */
export type AuditAction =
  | "login.success"
  | "login.failure"
  | "login.mfa_failure"
  | "user.created"
  | "user.invited"
  | "user.invite_accepted"
  | "user.role_changed"
  | "user.activated"
  | "user.deactivated"
  | "password.reset_requested"
  | "password.reset_completed"
  | "password.changed"
  | "mfa.enabled"
  | "mfa.disabled"
  | "mfa.recovery_code_used"
  | "proposal.approved"
  | "proposal.rejected"
  | "proposal.changes_requested"
  | "access.requested"
  | "access.approved"
  | "access.declined";

export type AuditEntry = {
  action: AuditAction;
  actor?: Pick<SessionUser, "id" | "username"> | null;
  /** For actions with no signed-in actor, e.g. a failed login's username. */
  actorLabel?: string | null;
  targetUserId?: number | null;
  targetLabel?: string | null;
  detail?: Record<string, unknown> | null;
  ip?: string | null;
};

/**
 * Append one audit row. Best effort: the action it describes has already
 * happened, so a logging failure is reported but never thrown.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(adminAuditLogTable).values({
      action: entry.action,
      actorUserId: entry.actor?.id ?? null,
      actorLabel: entry.actor?.username ?? entry.actorLabel ?? null,
      targetUserId: entry.targetUserId ?? null,
      targetLabel: entry.targetLabel ?? null,
      detail: entry.detail ?? null,
      ip: entry.ip ?? null,
    });
  } catch (error) {
    if (isMissingSchemaError(error)) {
      console.warn(`admin_audit_log missing; skipped ${entry.action}.`);
      return;
    }
    console.error(`Audit log write failed (${entry.action}):`, error);
  }
}

export type AuditLogRow = typeof adminAuditLogTable.$inferSelect;

export const AUDIT_PAGE_SIZE = 25;

/** Newest first, keyset-paginated by id (ids only grow). */
export async function listAuditLog(options: {
  before?: number | null;
  limit?: number;
}): Promise<{ entries: AuditLogRow[]; nextBefore: number | null }> {
  const limit = Math.min(Math.max(options.limit ?? AUDIT_PAGE_SIZE, 1), 100);
  const rows = await db
    .select()
    .from(adminAuditLogTable)
    .where(
      options.before ? lt(adminAuditLogTable.id, options.before) : undefined,
    )
    .orderBy(desc(adminAuditLogTable.id))
    .limit(limit + 1);
  const entries = rows.slice(0, limit);
  return {
    entries,
    nextBefore:
      rows.length > limit ? (entries[entries.length - 1]?.id ?? null) : null,
  };
}
