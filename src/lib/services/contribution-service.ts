import { db } from "@lib/db";
import { contributionsTable, adminUsersTable } from "@drizzle/schema";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import type { EditProposalSummary } from "./proposal-service";

export type ContributionSource = "proposal_approved";

export async function recordProposalContribution(
  proposal: EditProposalSummary,
): Promise<void> {
  if (!proposal.submitterUserId) return;

  await db.insert(contributionsTable).values({
    userId: proposal.submitterUserId,
    submitterName: proposal.submitterName,
    entityType: proposal.entityType,
    entityId: proposal.entityId,
    entityLabel: proposal.entityLabel,
    source: "proposal_approved",
    proposalId: proposal.id,
  });
}

export type LeaderboardWindow = "month" | "semester" | "all";

function windowStart(window: LeaderboardWindow): Date | null {
  const now = new Date();
  if (window === "all") return null;
  if (window === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  const month = now.getMonth();
  const year = now.getFullYear();
  // Academic semester rough cut: Jan–May = 2nd sem; Aug–Dec = 1st sem; else midyear slice
  if (month >= 7) return new Date(year, 7, 1);
  if (month <= 4) return new Date(year, 0, 1);
  return new Date(year, 5, 1);
}

export type LeaderboardRow = {
  rank: number;
  displayName: string;
  contributionCount: number;
  lastContributionAt: string;
};

export async function getContributorLeaderboard(
  window: LeaderboardWindow = "month",
  limit = 25,
): Promise<LeaderboardRow[]> {
  const start = windowStart(window);
  const conditions = [sql`${contributionsTable.userId} IS NOT NULL`];
  if (start) {
    conditions.push(gte(contributionsTable.createdAt, start.toISOString()));
  }

  const rows = await db
    .select({
      userId: contributionsTable.userId,
      displayName: adminUsersTable.displayName,
      username: adminUsersTable.username,
      contributionCount: count(),
      lastContributionAt: sql<string>`max(${contributionsTable.createdAt})`,
    })
    .from(contributionsTable)
    .innerJoin(
      adminUsersTable,
      eq(contributionsTable.userId, adminUsersTable.id),
    )
    .where(and(...conditions))
    .groupBy(
      contributionsTable.userId,
      adminUsersTable.displayName,
      adminUsersTable.username,
    )
    .orderBy(desc(count()), desc(sql`max(${contributionsTable.createdAt})`))
    .limit(limit);

  return rows.map((row, index) => ({
    rank: index + 1,
    displayName: row.displayName || row.username || "Contributor",
    contributionCount: Number(row.contributionCount),
    lastContributionAt: row.lastContributionAt,
  }));
}
