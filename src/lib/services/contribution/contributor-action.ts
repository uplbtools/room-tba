import { db } from '#lib/utils/db.js';
import { adminUsersTable, contributionsTable, editProposalsTable } from '#lib/server/db/schema.js';
import {
	buildCreditKeyResolver,
	classifyContribution,
	daysLeft,
	emptyBreakdown,
	hallOfFame,
	isContributionKind,
	periodAt,
	pointsToPass,
	rankContributors,
	type LeaderboardWindow,
	type LedgerRow,
	type Standing
} from '#lib/utils/contributors/scoring.js';
import { createHash } from 'node:crypto';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import type { EditProposalSummary } from './proposal-action';

export type ContributionSource = 'proposal_approved' | 'editor_published';

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
	input: Omit<ContributionInput, 'source'>
): Promise<void> {
	await recordContribution({ ...input, source: 'editor_published' });
}

export async function recordProposalContribution(proposal: EditProposalSummary): Promise<void> {
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
		source: 'proposal_approved',
		proposalId: proposal.id
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

export async function getMyContributions(userId: number, limit = 50): Promise<MyContribution[]> {
	return db
		.select({
			id: contributionsTable.id,
			entityType: contributionsTable.entityType,
			entityId: contributionsTable.entityId,
			entityLabel: contributionsTable.entityLabel,
			source: contributionsTable.source,
			createdAt: contributionsTable.createdAt
		})
		.from(contributionsTable)
		.where(eq(contributionsTable.userId, userId))
		.orderBy(desc(contributionsTable.createdAt), desc(contributionsTable.id))
		.limit(limit)
		.then((rows) =>
			rows.map((row) => ({
				...row,
				source: row.source as ContributionSource
			}))
		);
}

const patchKeys = sql<string[] | null>`case
	when ${contributionsTable.kind} is null
		and jsonb_typeof(${editProposalsTable.proposedPatch}) = 'object'
	then (select array_agg(k) from jsonb_object_keys(${editProposalsTable.proposedPatch}) as k)
end`;

async function loadLedger(source: ContributionSource): Promise<LedgerRow[]> {
	const rows = await db
		.select({
			id: contributionsTable.id,
			userId: contributionsTable.userId,
			contributorId: contributionsTable.contributorId,
			submitterName: contributionsTable.submitterName,
			entityType: contributionsTable.entityType,
			entityId: contributionsTable.entityId,
			entityLabel: contributionsTable.entityLabel,
			kind: contributionsTable.kind,
			createdAt: contributionsTable.createdAt,
			patchKeys,
			username: adminUsersTable.username,
			displayName: adminUsersTable.displayName,
			isActive: adminUsersTable.isActive,
			showInCredits: adminUsersTable.showInCredits,
			deletedAt: adminUsersTable.deletedAt
		})
		.from(contributionsTable)
		.leftJoin(adminUsersTable, eq(contributionsTable.userId, adminUsersTable.id))
		.leftJoin(editProposalsTable, eq(contributionsTable.proposalId, editProposalsTable.id))
		.where(and(eq(contributionsTable.source, source), isNull(contributionsTable.revertedAt)));

	return rows.map((row) => ({
		id: row.id,
		userId: row.userId,
		contributorId: row.contributorId,
		submitterName: row.submitterName,
		accountName: row.userId != null ? row.displayName?.trim() || row.username || null : null,
		accountVisible:
			row.userId == null || Boolean(row.isActive && row.showInCredits && !row.deletedAt),
		kind: isContributionKind(row.kind)
			? row.kind
			: classifyContribution({ entityType: row.entityType, keys: row.patchKeys }),
		entityType: row.entityType,
		entityId: row.entityId,
		entityLabel: row.entityLabel,
		createdAtMs: Date.parse(`${row.createdAt.replace(' ', 'T')}Z`)
	}));
}

function publicKey(key: string): string {
	if (key.startsWith('u:')) return `u${key.slice(2)}`;
	if (key.startsWith('c:')) {
		return `c${createHash('sha256').update(key.slice(2)).digest('hex').slice(0, 16)}`;
	}
	return `n${key.slice(2)}`;
}

function toRow(standing: Standing) {
	return {
		rank: standing.place,
		key: publicKey(standing.key),
		displayName: standing.displayName,
		points: standing.points,
		breakdown: standing.breakdown,
		medal: standing.medal,
		gettingStarted: standing.gettingStarted
	};
}

const windowBounds = (window: LeaderboardWindow, nowMs: number) =>
	window === 'all' ? null : periodAt(window, nowMs);

/**
 * Community submissions and editor publishes are separate boards. Ranking an
 * approver's publishes against a contributor's submissions compares two
 * different acts, and the approver always wins because approving is cheaper
 * than surveying.
 */
export async function getContributorLeaderboard(
	window: LeaderboardWindow,
	source: ContributionSource,
	limit = 25
) {
	const nowMs = Date.now();
	const rows = await loadLedger(source);
	const period = windowBounds(window, nowMs);
	const standings = rankContributors(rows, { fromMs: period?.startMs, toMs: period?.endMs });
	return {
		period: period && { label: period.label, daysLeft: daysLeft(period, nowMs) },
		rows: standings.slice(0, limit).map(toRow),
		hallOfFame: hallOfFame(rows, window, nowMs).map((entry) => ({
			label: entry.label,
			winners: entry.winners.map((winner) => ({ ...winner, key: publicKey(winner.key) }))
		}))
	};
}

/** Works outside the top 25. An account hidden from credits gets no rank and still sees its points. */
export async function getContributorStanding(
	window: LeaderboardWindow,
	source: ContributionSource,
	userId: number
) {
	const rows = await loadLedger(source);
	const resolver = buildCreditKeyResolver(rows);
	const key = resolver.keyForIdentity({ userId });
	if (!key) return null;
	const mine = rows.filter((row) => resolver.keyFor(row) === key);
	if (mine.length === 0) return null;

	const period = windowBounds(window, Date.now());
	const standings = rankContributors(rows, {
		fromMs: period?.startMs,
		toMs: period?.endMs,
		includeKey: key,
		resolver
	});
	const self = standings.find((standing) => standing.key === key);
	const [allTime] = rankContributors(mine, { includeKey: key, resolver });
	const visible = allTime?.visible ?? true;
	const pass = self && visible ? pointsToPass(standings, self) : null;

	return {
		key: publicKey(key),
		rank: visible && self ? self.place : null,
		points: self?.points ?? 0,
		breakdown: self?.breakdown ?? emptyBreakdown(),
		toPass: pass && { points: pass.points, rank: pass.place },
		optedOut: !visible
	};
}
