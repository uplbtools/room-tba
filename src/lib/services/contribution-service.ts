import { createHash } from "node:crypto";
import { db } from "@lib/db";
import {
  adminUsersTable,
  contributionsTable,
  editProposalsTable,
} from "@drizzle/schema";
import { and, desc, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import { toIsoTimestamp } from "@lib/editor/entity-attribution";
import { withUndefinedColumnFallback } from "@lib/db-column-fallback";
import {
  getBuildingCanonicalPath,
  getCollegeCanonicalPath,
  getDivisionCanonicalPath,
  getDormCanonicalPath,
  getOrganizationCanonicalPath,
  getRoomCanonicalPath,
} from "@lib/entity-urls";
import { getPlaceRouteSlug } from "@lib/route-slugs";
import {
  KIND_POINTS,
  badgesFor,
  buildCreditKeyResolver,
  classifyContribution,
  daysLeft,
  emptyBreakdown,
  hallOfFame,
  isContributionKind,
  periodAt,
  pointsToPass,
  rankContributors,
  type ContributionKind,
  type LeaderboardWindow,
  type LedgerRow,
  type Standing,
} from "@lib/contributors/scoring";
import type {
  ContributorProfile,
  LeaderboardResponse,
  LeaderboardRow,
  MyStanding,
} from "@lib/contributors/leaderboard-types";
import type { EditProposalSummary } from "./proposal-service";

import type { ContributionSource } from "@lib/contributors/leaderboard-query";

export type { ContributionSource } from "@lib/contributors/leaderboard-query";
export type { LeaderboardWindow } from "@lib/contributors/scoring";
export type { LeaderboardRow } from "@lib/contributors/leaderboard-types";

type ContributionInput = {
  // Null for public contributors who never registered. They are credited by
  // contributorId (a browser-held uuid), else by submitterName for rows that
  // predate the id.
  userId: number | null;
  submitterName: string;
  entityType: string;
  entityId: number;
  entityLabel: string;
  source: ContributionSource;
  proposalId?: number | null;
  contributorId?: string | null;
  kind: ContributionKind;
};

async function recordContribution(input: ContributionInput): Promise<void> {
  await withUndefinedColumnFallback(
    "record contribution",
    () => db.insert(contributionsTable).values(input),
    // Before migration 0053: drizzle names every schema column in an insert,
    // so write the pre-0053 columns by hand. The edit still gets its credit.
    () =>
      db.execute(sql`insert into contributions
        (user_id, submitter_name, entity_type, entity_id, entity_label, source, proposal_id)
        values (${input.userId}, ${input.submitterName}, ${input.entityType},
          ${input.entityId}, ${input.entityLabel}, ${input.source},
          ${input.proposalId ?? null})`),
  );
  ledgerCache.clear();
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
  // never written in the first place. They are recorded with a null userId.
  const patch = proposal.proposedPatch;
  await recordContribution({
    userId: proposal.submitterUserId ?? null,
    submitterName: proposal.submitterName,
    entityType: proposal.entityType,
    entityId: proposal.entityId,
    entityLabel: proposal.entityLabel,
    source: "proposal_approved",
    proposalId: proposal.id,
    contributorId: await readProposalContributorId(proposal.id),
    kind: classifyContribution({
      entityType: proposal.entityType,
      keys: patch && typeof patch === "object" ? Object.keys(patch) : [],
    }),
  });
}

/**
 * edit_proposals.contributor_id (migration 0053) is deliberately left out of
 * the drizzle table: `select()` and inserts name every declared column, so
 * declaring it would break every proposal read and write in the window where
 * new code runs before the migration. It is read and written here by hand,
 * and both become no-ops while the column is missing.
 */
export async function readProposalContributorId(
  proposalId: number,
): Promise<string | null> {
  return withUndefinedColumnFallback(
    "read proposal contributor",
    async () => {
      const result = await db.execute<{ contributor_id: string | null }>(
        sql`select contributor_id from edit_proposals where id = ${proposalId}`,
      );
      return result.rows[0]?.contributor_id ?? null;
    },
    async () => null,
  );
}

export async function writeProposalContributorId(
  proposalId: number,
  contributorId: string | null | undefined,
): Promise<void> {
  if (!contributorId) return;
  await withUndefinedColumnFallback(
    "write proposal contributor",
    () =>
      db.execute(
        sql`update edit_proposals
          set contributor_id = coalesce(contributor_id, ${contributorId}::uuid)
          where id = ${proposalId}`,
      ),
    async () => undefined,
  );
}

/**
 * A restore undid every edit after the restored version. Those edits stay in
 * the ledger for the audit trail but stop earning points. Event location edits
 * are their own proposal type over the event row, so they go with it.
 */
export async function markContributionsReverted(input: {
  entityType: string;
  entityId: number;
  /** created_at of the first history row the restore undid. */
  since: string;
  /** Highest ledger id before the restore wrote its own row. */
  throughId: number;
}): Promise<void> {
  const types =
    input.entityType === "event"
      ? ["event", "event_locations"]
      : [input.entityType];
  const mark = () =>
    db
      .update(contributionsTable)
      .set({ revertedAt: sql`now()` })
      .where(
        and(
          inArray(contributionsTable.entityType, types),
          eq(contributionsTable.entityId, input.entityId),
          sql`${contributionsTable.createdAt} >= ${input.since}`,
          lte(contributionsTable.id, input.throughId),
          isNull(contributionsTable.revertedAt),
        ),
      );
  // Before migration 0053 there is no reverted_at to set; the restore itself
  // must not fail over leaderboard bookkeeping.
  await withUndefinedColumnFallback("mark reverted", mark, async () => {});
  ledgerCache.clear();
}

export async function latestContributionId(): Promise<number> {
  const [row] = await db
    .select({ id: sql<number | null>`max(${contributionsTable.id})` })
    .from(contributionsTable);
  return Number(row?.id ?? 0);
}

export type MyContribution = {
  id: number;
  entityType: string;
  entityId: number;
  entityLabel: string;
  source: ContributionSource;
  kind: ContributionKind;
  points: number;
  createdAt: string;
};

export async function getMyContributions(
  userId: number,
  limit = 50,
): Promise<MyContribution[]> {
  const query = (legacy: boolean) =>
    db
      .select({
        id: contributionsTable.id,
        entityType: contributionsTable.entityType,
        entityId: contributionsTable.entityId,
        entityLabel: contributionsTable.entityLabel,
        source: contributionsTable.source,
        kind: legacy ? sql<string | null>`null` : contributionsTable.kind,
        patchKeys: patchKeys(legacy),
        createdAt: contributionsTable.createdAt,
      })
      .from(contributionsTable)
      .leftJoin(
        editProposalsTable,
        eq(contributionsTable.proposalId, editProposalsTable.id),
      )
      .where(
        and(
          eq(contributionsTable.userId, userId),
          legacy ? undefined : isNull(contributionsTable.revertedAt),
        ),
      )
      .orderBy(desc(contributionsTable.createdAt), desc(contributionsTable.id))
      .limit(limit);
  const rows = await withUndefinedColumnFallback(
    "my contributions",
    () => query(false),
    () => query(true),
  );
  return rows.map(({ patchKeys, ...row }) => {
    const kind = resolveKind(row.kind, row.entityType, patchKeys);
    return {
      ...row,
      source: row.source as ContributionSource,
      kind,
      points: KIND_POINTS[kind],
    };
  });
}

// ---------------------------------------------------------------------------
// Ledger reads. Every board, standing and profile is computed in TS from the
// same rows (scoring.ts), so ranking rules have one implementation with unit
// tests. The ledger is small (one row per approved edit) and the API layer
// caches responses for a minute; this per-instance memo spares the database
// when several personal standings are asked for in a burst.

const LEDGER_TTL_MS = 30_000;
const ledgerCache = new Map<
  ContributionSource,
  { at: number; rows: Promise<LedgerRow[]> }
>();

// Legacy rows have no kind; classify them from the fields the proposal
// touched. Only keys are read, never the (possibly large) patch values.
// `legacy` is the pre-0053 database, which has no kind column at all.
function patchKeys(legacy: boolean) {
  const needed = legacy ? sql`true` : sql`${contributionsTable.kind} is null`;
  return sql<string[] | null>`case
  when ${needed}
    and jsonb_typeof(${editProposalsTable.proposedPatch}) = 'object'
  then (select array_agg(k) from jsonb_object_keys(${editProposalsTable.proposedPatch}) as k)
end`;
}

function resolveKind(
  stored: string | null,
  entityType: string,
  patchKeys: string[] | null,
): ContributionKind {
  return isContributionKind(stored)
    ? stored
    : classifyContribution({ entityType, keys: patchKeys ?? [] });
}

function toMs(value: string): number {
  return Date.parse(toIsoTimestamp(value));
}

async function queryLedger(source: ContributionSource): Promise<LedgerRow[]> {
  const query = (legacy: boolean) =>
    db
      .select({
        id: contributionsTable.id,
        userId: contributionsTable.userId,
        contributorId: legacy
          ? sql<string | null>`null`
          : contributionsTable.contributorId,
        submitterName: contributionsTable.submitterName,
        entityType: contributionsTable.entityType,
        entityId: contributionsTable.entityId,
        entityLabel: contributionsTable.entityLabel,
        kind: legacy ? sql<string | null>`null` : contributionsTable.kind,
        createdAt: contributionsTable.createdAt,
        patchKeys: patchKeys(legacy),
        username: adminUsersTable.username,
        displayName: adminUsersTable.displayName,
        isActive: adminUsersTable.isActive,
        showInCredits: adminUsersTable.showInCredits,
        deletedAt: adminUsersTable.deletedAt,
      })
      .from(contributionsTable)
      .leftJoin(
        adminUsersTable,
        eq(contributionsTable.userId, adminUsersTable.id),
      )
      .leftJoin(
        editProposalsTable,
        eq(contributionsTable.proposalId, editProposalsTable.id),
      )
      .where(
        and(
          eq(contributionsTable.source, source),
          legacy ? undefined : isNull(contributionsTable.revertedAt),
        ),
      );
  // Before migration 0053: every row counts and groups by name, as before.
  const rows = await withUndefinedColumnFallback(
    "contribution ledger",
    () => query(false),
    () => query(true),
  );

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    contributorId: row.contributorId,
    submitterName: row.submitterName,
    accountName:
      row.userId != null
        ? row.displayName?.trim() || row.username || null
        : null,
    accountVisible:
      row.userId == null ||
      Boolean(row.isActive && row.showInCredits && !row.deletedAt),
    kind: resolveKind(row.kind, row.entityType, row.patchKeys),
    entityType: row.entityType,
    entityId: row.entityId,
    entityLabel: row.entityLabel,
    createdAtMs: toMs(row.createdAt),
  }));
}

function loadLedger(source: ContributionSource): Promise<LedgerRow[]> {
  const now = Date.now();
  const cached = ledgerCache.get(source);
  if (cached && now - cached.at < LEDGER_TTL_MS) return cached.rows;
  const rows = queryLedger(source);
  ledgerCache.set(source, { at: now, rows });
  rows.catch(() => ledgerCache.delete(source));
  return rows;
}

/**
 * The key leaves the server in URLs, so a contributor uuid is hashed: whoever
 * holds the raw id can earn points under it.
 */
export function publicContributorKey(key: string): string {
  if (key.startsWith("u:")) return `u${key.slice(2)}`;
  if (key.startsWith("c:")) {
    return `c${createHash("sha256").update(key.slice(2)).digest("hex").slice(0, 16)}`;
  }
  return `n${key.slice(2)}`;
}

function windowBounds(window: LeaderboardWindow, nowMs: number) {
  return window === "all" ? null : periodAt(window, nowMs);
}

function toPublicRow(standing: Standing): LeaderboardRow {
  return {
    rank: standing.place,
    key: publicContributorKey(standing.key),
    displayName: standing.displayName,
    points: standing.points,
    contributionCount: standing.contributions,
    breakdown: standing.breakdown,
    medal: standing.medal,
    gettingStarted: standing.gettingStarted,
    lastContributionAt: new Date(standing.lastAtMs).toISOString(),
  };
}

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
  nowMs = Date.now(),
): Promise<Omit<LeaderboardResponse, "board">> {
  const rows = await loadLedger(source);
  const period = windowBounds(window, nowMs);
  const standings = rankContributors(rows, {
    fromMs: period?.startMs,
    toMs: period?.endMs,
  });
  return {
    window,
    period: period
      ? {
          label: period.label,
          endsAt: new Date(period.endMs).toISOString(),
          daysLeft: daysLeft(period, nowMs),
        }
      : null,
    rows: standings.slice(0, limit).map(toPublicRow),
    hallOfFame: hallOfFame(rows, window, nowMs).map((entry) => ({
      label: entry.label,
      winners: entry.winners.map((winner) => ({
        ...winner,
        key: publicContributorKey(winner.key),
      })),
    })),
  };
}

/**
 * "Your rank", for a signed-in account or a public contributor's browser id.
 * Works outside the top 25 and for accounts hidden from credits (rank is then
 * null: they still see their points, nobody else sees them).
 */
export async function getContributorStanding(input: {
  window: LeaderboardWindow;
  source: ContributionSource;
  userId?: number | null;
  contributorId?: string | null;
  nowMs?: number;
}): Promise<MyStanding | null> {
  const nowMs = input.nowMs ?? Date.now();
  const rows = await loadLedger(input.source);
  const resolver = buildCreditKeyResolver(rows);
  const key = resolver.keyForIdentity(input);
  if (!key) return null;

  const mine = rows
    .filter((row) => resolver.keyFor(row) === key)
    .sort((a, b) => b.createdAtMs - a.createdAtMs);
  if (mine.length === 0) return null;

  const period = windowBounds(input.window, nowMs);
  const standings = rankContributors(rows, {
    fromMs: period?.startMs,
    toMs: period?.endMs,
    includeKey: key,
    resolver,
  });
  const [allTime] = rankContributors(mine, { includeKey: key, resolver });
  const self = standings.find((standing) => standing.key === key);
  const visible = allTime?.visible ?? true;
  const pass = self && visible ? pointsToPass(standings, self) : null;

  return {
    key: publicContributorKey(key),
    displayName: allTime?.displayName ?? "You",
    rank: visible && self ? self.place : null,
    points: self?.points ?? 0,
    contributionCount: self?.contributions ?? 0,
    breakdown: self?.breakdown ?? emptyBreakdown(),
    toPass: pass ? { points: pass.points, rank: pass.place } : null,
    optedOut: !visible,
    totalContributions: mine.length,
    badges: badgesFor(mine.length),
    recent: mine.slice(0, 10).map((row) => ({
      id: row.id,
      kind: row.kind,
      points: KIND_POINTS[row.kind],
      entityLabel: row.entityLabel,
      createdAt: new Date(row.createdAtMs).toISOString(),
    })),
  };
}

/** Public link for a ledger row's entity, when it can be built from the row. */
export function contributionHref(
  row: Pick<LedgerRow, "entityType" | "entityId" | "entityLabel">,
  source: ContributionSource,
): string | null {
  if (row.entityId < 1 || row.entityType.startsWith("create_")) return null;
  const label = row.entityLabel.trim();
  // Id-addressed routes resolve by the trailing id, so any label works.
  switch (row.entityType) {
    case "room":
      return getRoomCanonicalPath({ id: row.entityId, code: label || "room" });
    case "dorm":
      return getDormCanonicalPath({
        id: row.entityId,
        dormName: label || "dorm",
      });
    case "place":
      return `/establishment/${getPlaceRouteSlug({ id: row.entityId, name: label || "place" })}/`;
    case "organization":
      return getOrganizationCanonicalPath({
        id: row.entityId,
        name: label || "organization",
      });
  }
  // Name-addressed routes need the real name. Proposal labels are the entity
  // name; editor labels are a best guess from the snapshot, so skip those.
  if (source !== "proposal_approved" || !label) return null;
  switch (row.entityType) {
    case "building":
      return getBuildingCanonicalPath(label);
    case "college":
      return getCollegeCanonicalPath(label);
    case "division":
      return getDivisionCanonicalPath(label);
    default:
      return null;
  }
}

/**
 * Public profile behind a leaderboard name. Accounts hidden from credits have
 * no profile; the endpoint answers 404 exactly as for an unknown key.
 */
export async function getContributorProfile(
  publicKey: string,
  source: ContributionSource = "proposal_approved",
): Promise<ContributorProfile | null> {
  const rows = await loadLedger(source);
  const resolver = buildCreditKeyResolver(rows);
  const mine = rows
    .filter((row) => {
      const key = resolver.keyFor(row);
      return key !== null && publicContributorKey(key) === publicKey;
    })
    .sort((a, b) => b.createdAtMs - a.createdAtMs);
  const key = mine[0] ? resolver.keyFor(mine[0]) : null;
  if (!key) return null;
  const [standing] = rankContributors(mine, { resolver });
  if (!standing) return null; // hidden account

  let avatarUrl: string | null = null;
  let profileUrl: string | null = null;
  let joinedAt = new Date(standing.firstAtMs).toISOString();
  if (key.startsWith("u:")) {
    const [account] = await db
      .select({
        avatarUrl: adminUsersTable.avatarUrl,
        profileUrl: adminUsersTable.profileUrl,
        createdAt: adminUsersTable.createdAt,
      })
      .from(adminUsersTable)
      .where(eq(adminUsersTable.id, Number(key.slice(2))))
      .limit(1);
    if (account) {
      avatarUrl = account.avatarUrl;
      profileUrl = account.profileUrl;
      joinedAt = toIsoTimestamp(account.createdAt);
    }
  }

  return {
    key: publicKey,
    displayName: standing.displayName,
    avatarUrl,
    profileUrl,
    joinedAt,
    points: standing.points,
    contributionCount: standing.contributions,
    breakdown: standing.breakdown,
    badges: badgesFor(standing.contributions),
    recent: mine.slice(0, 8).map((row) => ({
      id: row.id,
      kind: row.kind,
      entityLabel: row.entityLabel,
      href: contributionHref(row, source),
      createdAt: new Date(row.createdAtMs).toISOString(),
    })),
  };
}

/** @internal test helper */
export function clearLedgerCacheForTests() {
  ledgerCache.clear();
}
