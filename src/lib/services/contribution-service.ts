import { db } from "@lib/db";
import { contributionsTable, adminUsersTable } from "@drizzle/schema";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import type { EditProposalSummary } from "./proposal-service";

export type ContributionSource = "proposal_approved" | "editor_published";

type ContributionInput = {
  userId: number;
  submitterName: string;
  entityType: string;
  entityId: number;
  entityLabel: string;
  source: ContributionSource;
  proposalId?: number | null;
};

async function recordContribution(input: ContributionInput): Promise<void> {
  await db.insert(contributionsTable).values(input);
}

export async function recordEditorContribution(
  input: Omit<ContributionInput, "source">,
): Promise<void> {
  await recordContribution({ ...input, source: "editor_published" });
}

export async function recordProposalContribution(
  proposal: EditProposalSummary,
): Promise<void> {
  if (!proposal.submitterUserId) return;

  await recordContribution({
    userId: proposal.submitterUserId,
    submitterName: proposal.submitterName,
    entityType: proposal.entityType,
    entityId: proposal.entityId,
    entityLabel: proposal.entityLabel,
    source: "proposal_approved",
    proposalId: proposal.id,
  });
}

export type MyContribution = {
  id: number;
  entityType: string;
  entityId: number;
  entityLabel: string;
  source: ContributionSource;
  createdAt: string;
};

export async function getMyContributions(
  userId: number,
  limit = 50,
): Promise<MyContribution[]> {
  return db
    .select({
      id: contributionsTable.id,
      entityType: contributionsTable.entityType,
      entityId: contributionsTable.entityId,
      entityLabel: contributionsTable.entityLabel,
      source: contributionsTable.source,
      createdAt: contributionsTable.createdAt,
    })
    .from(contributionsTable)
    .where(eq(contributionsTable.userId, userId))
    .orderBy(desc(contributionsTable.createdAt), desc(contributionsTable.id))
    .limit(limit)
    .then((rows) =>
      rows.map((row) => ({
        ...row,
        source: row.source as ContributionSource,
      })),
    );
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
    .where(
      and(
        ...conditions,
        eq(adminUsersTable.isActive, true),
        eq(adminUsersTable.showInCredits, true),
      ),
    )
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
