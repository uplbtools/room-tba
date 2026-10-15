import { json } from '@sveltejs/kit';
import { and, count, desc, eq, gte, sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.js';
import { adminUsersTable, contributionsTable } from '#lib/server/db/schema.js';
import type { RequestHandler } from './$types';

// Inlined from astro/src/lib/services/contribution-service.ts
type ContributionSource = 'proposal_approved' | 'editor_published';

type LeaderboardWindow = 'month' | 'semester' | 'all';

type LeaderboardRow = {
	rank: number;
	displayName: string;
	contributionCount: number;
	lastContributionAt: string;
};

const WINDOWS = new Set<LeaderboardWindow>(['month', 'semester', 'all']);

// Two boards, not one ranking: "community" counts approved public submissions,
// "editors" counts what editors published directly.
const BOARDS: Record<string, ContributionSource> = {
	community: 'proposal_approved',
	editors: 'editor_published'
};

function windowStart(window: LeaderboardWindow): Date | null {
	const now = new Date();
	if (window === 'all') return null;
	if (window === 'month') {
		return new Date(now.getFullYear(), now.getMonth(), 1);
	}
	const month = now.getMonth();
	const year = now.getFullYear();
	// Academic semester rough cut: Jan–May = 2nd sem; Aug–Dec = 1st sem; else midyear slice
	if (month >= 7) return new Date(year, 7, 1);
	if (month <= 4) return new Date(year, 0, 1);
	return new Date(year, 5, 1);
}

/**
 * Community submissions and editor publishes are separate boards. Ranking an
 * approver's publishes against a contributor's submissions compares two
 * different acts, and the approver always wins because approving is cheaper
 * than surveying.
 */
async function getContributorLeaderboard(
	window: LeaderboardWindow = 'month',
	source: ContributionSource = 'proposal_approved',
	limit = 25
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
		sql`(${contributionsTable.userId} IS NULL OR (${adminUsersTable.isActive} AND ${adminUsersTable.showInCredits}))`
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
			lastContributionAt: sql<string>`max(${contributionsTable.createdAt})`
		})
		.from(contributionsTable)
		.leftJoin(adminUsersTable, eq(contributionsTable.userId, adminUsersTable.id))
		.where(and(...conditions))
		.groupBy(creditKey)
		.orderBy(desc(count()), desc(sql`max(${contributionsTable.createdAt})`))
		.limit(limit);

	return rows.map((row, index) => ({
		rank: index + 1,
		displayName: row.displayName || 'Contributor',
		contributionCount: Number(row.contributionCount),
		lastContributionAt: row.lastContributionAt
	}));
}

export const GET: RequestHandler = async ({ url }) => {
	const windowParam = url.searchParams.get('window') ?? 'month';
	const window = WINDOWS.has(windowParam as LeaderboardWindow)
		? (windowParam as LeaderboardWindow)
		: 'month';

	const boardParam = url.searchParams.get('board') ?? 'community';
	const board = boardParam in BOARDS ? boardParam : 'community';

	try {
		const rows = await getContributorLeaderboard(window, BOARDS[board]);
		return json({ window, board, rows });
	} catch (e) {
		console.error('leaderboard query failed:', e);
		return json({ error: 'Leaderboard is temporarily unavailable.' }, { status: 500 });
	}
};
