export const CONTRIBUTION_KINDS = ['place', 'rooms', 'photo', 'position', 'text'] as const;

export type ContributionKind = (typeof CONTRIBUTION_KINDS)[number];

export const KIND_POINTS: Record<ContributionKind, number> = {
	place: 5,
	rooms: 3,
	photo: 2,
	position: 2,
	text: 1
};

export const KIND_LABELS: Record<ContributionKind, string> = {
	place: 'New places',
	rooms: 'Rooms and schedules',
	photo: 'Photos',
	position: 'Map pin fixes',
	text: 'Text edits'
};

export const MEDAL_MIN_POINTS = 3;

const MAX_MEDAL_TIE = 3;

export function isContributionKind(value: string | null | undefined): value is ContributionKind {
	return (CONTRIBUTION_KINDS as readonly string[]).includes(value ?? '');
}

const POSITION_KEYS = new Set(['lat', 'lon', 'locations']);

export function classifyContribution(input: {
	entityType: string;
	keys?: readonly string[] | null;
	action?: string | null;
}): ContributionKind {
	const keys = input.keys ?? [];
	const isCreate = input.entityType.startsWith('create_') || input.action === 'create';
	const base = input.entityType.replace(/^create_/, '');
	if (isCreate) return base === 'room' ? 'rooms' : 'place';
	if (base.startsWith('room') || keys.includes('rooms')) return 'rooms';
	if (keys.includes('imageUrl')) return 'photo';
	if (base === 'event_locations' || keys.some((key) => POSITION_KEYS.has(key))) return 'position';
	return 'text';
}

export type LedgerRow = {
	id: number;
	userId: number | null;
	contributorId: string | null;
	submitterName: string | null;
	accountName: string | null;
	accountVisible: boolean;
	kind: ContributionKind;
	entityType: string;
	entityId: number;
	entityLabel: string;
	createdAtMs: number;
};

export function normalizeCreditName(name: string): string {
	return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function buildCreditKeyResolver(rows: readonly LedgerRow[]) {
	const linked = new Map<string, number>();
	for (const row of rows) {
		if (row.userId != null && row.contributorId) {
			linked.set(row.contributorId, row.userId);
		}
	}
	const userKey = (id: number) => `u:${id}`;
	return {
		linked,
		keyFor(row: Pick<LedgerRow, 'userId' | 'contributorId' | 'submitterName'>) {
			if (row.userId != null) return userKey(row.userId);
			if (row.contributorId) {
				const owner = linked.get(row.contributorId);
				return owner != null ? userKey(owner) : `c:${row.contributorId}`;
			}
			const name = normalizeCreditName(row.submitterName ?? '');
			return name ? `n:${name}` : null;
		},
		keyForIdentity(identity: { userId?: number | null; contributorId?: string | null }) {
			if (identity.userId != null) return userKey(identity.userId);
			if (identity.contributorId) {
				const owner = linked.get(identity.contributorId);
				return owner != null ? userKey(owner) : `c:${identity.contributorId}`;
			}
			return null;
		}
	};
}

export type KindBreakdown = Record<ContributionKind, number>;

export function emptyBreakdown(): KindBreakdown {
	return { place: 0, rooms: 0, photo: 0, position: 0, text: 0 };
}

export type Standing = {
	key: string;
	displayName: string;
	points: number;
	contributions: number;
	breakdown: KindBreakdown;
	firstAtMs: number;
	lastAtMs: number;
	place: number;
	medal: 1 | 2 | 3 | null;
	gettingStarted: boolean;
	visible: boolean;
};

type Group = Omit<Standing, 'place' | 'medal' | 'gettingStarted'> & {
	nameAtMs: number;
};

export function rankContributors(
	rows: readonly LedgerRow[],
	options: {
		fromMs?: number | null;
		toMs?: number | null;
		includeHidden?: boolean;
		includeKey?: string | null;
		resolver?: ReturnType<typeof buildCreditKeyResolver>;
	} = {}
): Standing[] {
	const resolver = options.resolver ?? buildCreditKeyResolver(rows);
	const groups = new Map<string, Group>();
	const visibility = new Map<string, boolean>();
	for (const row of rows) {
		if (row.userId != null) {
			const key = `u:${row.userId}`;
			visibility.set(key, (visibility.get(key) ?? true) && row.accountVisible);
		}
	}

	for (const row of rows) {
		if (options.fromMs != null && row.createdAtMs < options.fromMs) continue;
		if (options.toMs != null && row.createdAtMs >= options.toMs) continue;
		const key = resolver.keyFor(row);
		if (!key) continue;
		const visible = visibility.get(key) ?? true;
		if (!visible && !options.includeHidden && key !== options.includeKey) continue;

		let group = groups.get(key);
		if (!group) {
			group = {
				key,
				displayName: '',
				points: 0,
				contributions: 0,
				breakdown: emptyBreakdown(),
				firstAtMs: row.createdAtMs,
				lastAtMs: row.createdAtMs,
				visible,
				nameAtMs: Number.NEGATIVE_INFINITY
			};
			groups.set(key, group);
		}
		group.points += KIND_POINTS[row.kind];
		group.contributions += 1;
		group.breakdown[row.kind] += 1;
		group.firstAtMs = Math.min(group.firstAtMs, row.createdAtMs);
		group.lastAtMs = Math.max(group.lastAtMs, row.createdAtMs);
		const name = row.accountName?.trim() || row.submitterName?.trim() || '';
		if (name && (row.accountName || row.createdAtMs >= group.nameAtMs)) {
			group.displayName = name;
			group.nameAtMs = row.accountName ? Number.POSITIVE_INFINITY : row.createdAtMs;
		}
	}

	const sorted = [...groups.values()].sort(
		(a, b) => b.points - a.points || a.lastAtMs - b.lastAtMs || a.key.localeCompare(b.key)
	);
	return assignPlaces(sorted);
}

function assignPlaces(sorted: Group[]): Standing[] {
	const tieSize = new Map<number, number>();
	for (const group of sorted) {
		tieSize.set(group.points, (tieSize.get(group.points) ?? 0) + 1);
	}
	const everyoneTied = sorted.length > 1 && tieSize.size === 1;

	let place = 0;
	return sorted.map((group, index) => {
		const previous = sorted[index - 1];
		if (!previous || previous.points !== group.points) place = index + 1;
		const gettingStarted = group.points < MEDAL_MIN_POINTS;
		const medalEligible =
			place <= 3 &&
			!gettingStarted &&
			!everyoneTied &&
			(tieSize.get(group.points) ?? 0) <= MAX_MEDAL_TIE;
		const { nameAtMs: _nameAtMs, ...rest } = group;
		return {
			...rest,
			displayName: rest.displayName || 'Contributor',
			place,
			medal: medalEligible ? (place as 1 | 2 | 3) : null,
			gettingStarted
		};
	});
}

export function pointsToPass(
	standings: readonly Standing[],
	me: Pick<Standing, 'points' | 'key'>
): { points: number; place: number } | null {
	let target: Standing | null = null;
	for (const standing of standings) {
		if (standing.key === me.key) continue;
		if (standing.points > me.points) {
			if (!target || standing.points < target.points) target = standing;
		}
	}
	if (target) {
		return { points: target.points - me.points + 1, place: target.place };
	}
	const tiedAtTop = standings.some(
		(standing) => standing.key !== me.key && standing.points === me.points
	);
	return tiedAtTop && me.points > 0 ? { points: 1, place: 1 } : null;
}

export type LeaderboardWindow = 'month' | 'semester' | 'all';

export const LEADERBOARD_WINDOWS: readonly LeaderboardWindow[] = ['month', 'semester', 'all'];

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const MONTH_NAMES = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];

function manilaYearMonth(ms: number): { year: number; month: number } {
	const local = new Date(ms + MANILA_OFFSET_MS);
	return { year: local.getUTCFullYear(), month: local.getUTCMonth() };
}

function manilaMonthStart(year: number, month: number): number {
	return Date.UTC(year, month, 1) - MANILA_OFFSET_MS;
}

export type Period = {
	window: Exclude<LeaderboardWindow, 'all'>;
	startMs: number;
	endMs: number;
	label: string;
};

export function periodAt(window: Exclude<LeaderboardWindow, 'all'>, nowMs: number): Period {
	const { year, month } = manilaYearMonth(nowMs);
	if (window === 'month') {
		return {
			window,
			startMs: manilaMonthStart(year, month),
			endMs: manilaMonthStart(year, month + 1),
			label: `${MONTH_NAMES[month]} ${year}`
		};
	}
	if (month >= 7) {
		return {
			window,
			startMs: manilaMonthStart(year, 7),
			endMs: manilaMonthStart(year + 1, 0),
			label: `First semester ${year}-${year + 1}`
		};
	}
	if (month <= 4) {
		return {
			window,
			startMs: manilaMonthStart(year, 0),
			endMs: manilaMonthStart(year, 5),
			label: `Second semester ${year - 1}-${year}`
		};
	}
	return {
		window,
		startMs: manilaMonthStart(year, 5),
		endMs: manilaMonthStart(year, 7),
		label: `Midyear ${year}`
	};
}

export function daysLeft(period: Pick<Period, 'endMs'>, nowMs: number): number {
	return Math.max(0, Math.ceil((period.endMs - nowMs) / DAY_MS));
}

export function endsInLabel(days: number): string {
	if (days <= 1) return 'Ends today';
	return `Ends in ${days} days`;
}

export type HallOfFameEntry = {
	label: string;
	startMs: number;
	winners: { key: string; displayName: string; points: number }[];
};

export function hallOfFame(
	rows: readonly LedgerRow[],
	window: LeaderboardWindow,
	nowMs: number,
	limit = window === 'semester' ? 4 : 6
): HallOfFameEntry[] {
	if (rows.length === 0) return [];
	const periodWindow = window === 'semester' ? 'semester' : 'month';
	const resolver = buildCreditKeyResolver(rows);
	const earliest = Math.min(...rows.map((row) => row.createdAtMs));
	const entries: HallOfFameEntry[] = [];
	let period = periodAt(periodWindow, periodAt(periodWindow, nowMs).startMs - 1);
	while (entries.length < limit && period.endMs > earliest) {
		const standings = rankContributors(rows, {
			fromMs: period.startMs,
			toMs: period.endMs,
			resolver
		});
		const winners = standings
			.filter((standing) => standing.place === 1 && standing.points > 0)
			.map(({ key, displayName, points }) => ({ key, displayName, points }));
		if (winners.length > 0) {
			entries.push({ label: period.label, startMs: period.startMs, winners });
		}
		period = periodAt(periodWindow, period.startMs - 1);
	}
	return entries;
}

export function pointsLabel(points: number): string {
	return `${points} ${points === 1 ? 'point' : 'points'}`;
}
