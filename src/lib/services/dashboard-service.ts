import { desc } from "drizzle-orm";
import { editorHistoryTable } from "@drizzle/schema";
import { db } from "@lib/db";
import type { SessionUser } from "@lib/admin/auth";
import { type EmailHealth, emailHealth } from "@lib/email/email-log";
import { type OutboxHealth, outboxHealth } from "@lib/notifications/outbox";
import {
  listPendingAccessRequests,
  type PendingAccessRequest,
} from "@lib/services/access-request-service";
import { DIGEST_JOB, listStaffRecipients } from "@lib/services/digest-service";
import { type CronRunRow, latestCronRuns } from "@lib/services/cron-run-service";
import { getNotificationPreferences } from "@lib/services/notification-preferences-service";
import { countPendingProposals } from "@lib/services/proposal-service";
import { getMfaStatus, type MfaStatus } from "@lib/services/staff-security-service";

export type RecentActivity = {
  id: number;
  entityType: string;
  entityId: number;
  action: string;
  editedBy: string;
  summary: string | null;
  createdAt: string;
};

/** Staff landing page data (auth audit item 15). Sections fail independently. */
export type StaffDashboard = {
  pendingReviews: number | null;
  recentActivity: RecentActivity[];
  digest: {
    lastRuns: Pick<CronRunRow, "period" | "status" | "detail" | "finishedAt">[];
    recipientCount: number | null;
    youReceiveIt: boolean | null;
  };
  email: EmailHealth | null;
  outbox: OutboxHealth | null;
  mfa: MfaStatus | null;
  /** Admins only. */
  accessRequests: PendingAccessRequest[] | null;
};

async function settle<T>(label: string, work: () => Promise<T>): Promise<T | null> {
  try {
    return await work();
  } catch (error) {
    console.error(`Dashboard section ${label} failed:`, error);
    return null;
  }
}

function stripRedundantActor(actor: string): string {
  // Publishing actors are stored as `room-tba-publisher:<id>:<name>`.
  const match = /^room-tba-publisher:\d+:(.*)$/.exec(actor);
  return match?.[1] ?? actor;
}

export async function getStaffDashboard(user: SessionUser): Promise<StaffDashboard> {
  const isAdmin = user.role === "admin";
  const [pendingReviews, recent, runs, recipients, prefs, email, outbox, mfa, access] =
    await Promise.all([
      settle("pending", countPendingProposals),
      settle("activity", () =>
        db
          .select({
            id: editorHistoryTable.id,
            entityType: editorHistoryTable.entityType,
            entityId: editorHistoryTable.entityId,
            action: editorHistoryTable.action,
            editedBy: editorHistoryTable.editedBy,
            summary: editorHistoryTable.summary,
            createdAt: editorHistoryTable.createdAt,
          })
          .from(editorHistoryTable)
          .orderBy(desc(editorHistoryTable.createdAt))
          .limit(8),
      ),
      settle("digest-runs", () => latestCronRuns(DIGEST_JOB, 3)),
      settle("digest-recipients", () => listStaffRecipients("digest")),
      settle("prefs", () => getNotificationPreferences(user.id)),
      settle("email", emailHealth),
      settle("outbox", outboxHealth),
      settle("mfa", () => getMfaStatus(user)),
      isAdmin ? settle("access", listPendingAccessRequests) : Promise.resolve(null),
    ]);

  return {
    pendingReviews,
    recentActivity: (recent ?? []).map((row) => ({
      ...row,
      editedBy: stripRedundantActor(row.editedBy),
    })),
    digest: {
      lastRuns: (runs ?? []).map(({ period, status, detail, finishedAt }) => ({
        period,
        status,
        detail,
        finishedAt,
      })),
      recipientCount: recipients?.length ?? null,
      youReceiveIt: prefs?.digest ?? null,
    },
    email,
    outbox,
    mfa,
    accessRequests: access,
  };
}
