import { db } from "@lib/db";
import { contributionsTable, adminUsersTable } from "@drizzle/schema";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import type { EditProposalSummary } from "./proposal-service";

export type ContributionSource = "proposal_approved" | "editor_published";

type ContributionInput = {
  // Null for public contributors who never registered. They are credited by
  // submitterName instead, which the proposal flow validates and screens
  // against reserved names.
  userId: number | null;
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
  // Unregistered submitters used to be dropped here, which is why the
  // leaderboard only ever showed staff: the rows for public contributors were
  // never written in the first place. They are recorded with a null userId and
  // credited by name.
  await recordContribution({
    userId: proposal.submitterUserId ?? null,
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

/**
 * Community submissions and editor publishes are separate boards. Ranking an
 * approver's publishes against a contributor's submissions compares two
 * different acts, and the approver always wins because approving is cheaper
 * than surveying.
 */
export async function getContributorLeaderboard(
  window: LeaderboardWindow = "month",
  source: ContributionSource = "proposal_approved",
  limit = 25,
): Promise<LeaderboardRow[]> {
  const start = windowStart(window);

  // Credit key: registered contributors collapse under their username, public
  // ones under the name they submitted with. Not display_name, which is free
  // text a user can change and would split their own history across rows.
  const creditKey = sql`coalesce(${adminUsersTable.username}, ${contributionsTable.submitterName})`;

  const conditions = [
    eq(contributionsTable.source, source),
    // Rows with neither a user nor a submitted name cannot be credited to
    // anyone. Grouping them would merge unrelated people into one entry that
    // could outrank every real contributor.
    sql`${creditKey} IS NOT NULL`,
    // Left join, so registered users keep their opt-out while contributors with
    // no admin_users row (the public ones) are not filtered away by it.
    sql`(${contributionsTable.userId} IS NULL OR (${adminUsersTable.isActive} AND ${adminUsersTable.showInCredits}))`,
  ];
  if (start) {
    conditions.push(gte(contributionsTable.createdAt, start.toISOString()));
  }

  const rows = await db
    .select({
      displayName: sql<
        string | null
      >`coalesce(max(${adminUsersTable.displayName}), max(${adminUsersTable.username}), max(${contributionsTable.submitterName}))`,
      contributionCount: count(),
      lastContributionAt: sql<string>`max(${contributionsTable.createdAt})`,
    })
    .from(contributionsTable)
    .leftJoin(
      adminUsersTable,
      eq(contributionsTable.userId, adminUsersTable.id),
    )
    .where(and(...conditions))
    .groupBy(creditKey)
    .orderBy(desc(count()), desc(sql`max(${contributionsTable.createdAt})`))
    .limit(limit);

  return rows.map((row, index) => ({
    rank: index + 1,
    displayName: row.displayName || "Contributor",
    contributionCount: Number(row.contributionCount),
    lastContributionAt: row.lastContributionAt,
  }));
}
