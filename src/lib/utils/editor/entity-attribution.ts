import { buildFieldDiffs, type FieldDiff } from '#lib/utils/proposals/diff.js';

export const PUBLIC_HISTORY_FIELDS: Record<string, readonly string[]> = {
	place: ['name', 'category', 'description', 'hours', 'websiteLink', 'facebookLink', 'lat', 'lon'],
	building: ['buildingName', 'buildingType', 'directions', 'crFacilities', 'lat', 'lon'],
	room: ['roomCode', 'fullName', 'directions', 'category'],
	college: ['collegeName', 'websiteLink'],
	division: ['divisionName', 'websiteLink'],
	dorm: [
		'dormName',
		'shortName',
		'gender',
		'capacity',
		'managingOffice',
		'amenities',
		'description',
		'isUpManaged',
		'priceRange',
		'facebookLink',
		'lat',
		'lon'
	],
	organization: [
		'name',
		'category',
		'description',
		'bio',
		'orgType',
		'establishedYear',
		'memberCount',
		'websiteLink',
		'facebookLink',
		'lat',
		'lon'
	],
	event: ['title', 'description', 'category', 'startsAt', 'endsAt', 'recurrence', 'sourceUrl']
};

const ATTRIBUTABLE_ENTITY_TYPES = new Set([
	'building',
	'room',
	'dorm',
	'college',
	'division',
	'event'
]);

export type EntityAttributionRequest =
	| {
			ok: true;
			entityType: string;
			entityId: number;
	  }
	| {
			ok: false;
			status: number;
			error: string;
	  };

export function parseEntityAttributionRequest(params: URLSearchParams): EntityAttributionRequest {
	const entityType = params.get('entityType') ?? '';
	const entityId = Number(params.get('entityId'));

	if (!ATTRIBUTABLE_ENTITY_TYPES.has(entityType)) {
		return { ok: false, status: 400, error: 'Unsupported entity type.' };
	}
	if (!Number.isInteger(entityId) || entityId < 1) {
		return { ok: false, status: 400, error: 'Invalid entity ID.' };
	}

	return { ok: true, entityType, entityId };
}

export const ROOM_TBA_TEAM = 'Room TBA team';
export const ANONYMOUS_EDITOR = 'A Room TBA editor';

export type EditorAccount = {
	username: string;
	displayName: string | null;
	showInCredits: boolean;
};

export function publicActorName(
	actor: string | null | undefined,
	summary: string | null | undefined,
	accounts: readonly EditorAccount[] = []
): string | null {
	if (summary?.startsWith('[bulk:')) return ROOM_TBA_TEAM;
	const name = actor?.trim();
	if (!name) return null;
	if (/^admin$/i.test(name) || /(^|-)(seed|script|import)(-|$)/i.test(name)) {
		return ROOM_TBA_TEAM;
	}
	const account = accounts.find((a) => a.username === name || a.displayName === name);
	if (account && !account.showInCredits) return ANONYMOUS_EDITOR;
	const shown = account?.displayName?.trim() || name;
	return shown.includes('@') ? ANONYMOUS_EDITOR : shown;
}

export function toIsoTimestamp(value: string): string {
	const iso = value.includes('T') ? value : value.replace(' ', 'T');
	if (/[+-]\d\d$/.test(iso)) return `${iso}:00`;
	return /(Z|[+-]\d\d(:?\d\d)?)$/.test(iso) ? iso : `${iso}Z`;
}

export type HistoryRow = {
	id: number;
	entityType: string;
	action: string;
	editedBy: string;
	summary: string | null;
	before: unknown;
	after: unknown;
	createdAt: string;
};

export type ProposalCredit = {
	entityType: string;
	submitterName: string | null;
	createdAt: string;
};

// Approval writes the history row first and the contribution a moment later.
const CREDIT_WINDOW_MS = 10_000;

// Create proposals are stored as `create_<type>` with entity id 0, so they match by type and time.
export function creditForRow(row: HistoryRow, credits: readonly ProposalCredit[]): string | null {
	const at = Date.parse(toIsoTimestamp(row.createdAt));
	const type = row.action === 'create' ? `create_${row.entityType}` : row.entityType;
	let best: { name: string; delta: number } | null = null;
	for (const credit of credits) {
		if (credit.entityType !== type || !credit.submitterName) continue;
		const delta = Date.parse(toIsoTimestamp(credit.createdAt)) - at;
		if (delta < 0 || delta > CREDIT_WINDOW_MS) continue;
		if (!best || delta < best.delta) best = { name: credit.submitterName, delta };
	}
	return best?.name ?? null;
}

function rowAuthor(
	row: HistoryRow,
	credits: readonly ProposalCredit[],
	accounts: readonly EditorAccount[]
): string | null {
	const credited = creditForRow(row, credits);
	return credited
		? publicActorName(credited, null)
		: publicActorName(row.editedBy, row.summary, accounts);
}

export type PublicHistoryEntry = {
	id: number;
	action: string;
	by: string | null;
	createdAt: string;
	changes: FieldDiff[];
};

function pickPublic(snapshot: unknown, fields: readonly string[]): Record<string, unknown> | null {
	if (!snapshot || typeof snapshot !== 'object') return null;
	const source = snapshot as Record<string, unknown>;
	return Object.fromEntries(fields.filter((key) => key in source).map((key) => [key, source[key]]));
}

const squash = (value: string | null) => (value ?? '').replace(/\s+/g, ' ').trim();

export function publicChanges(row: HistoryRow): FieldDiff[] {
	const fields = PUBLIC_HISTORY_FIELDS[row.entityType];
	if (!fields) return [];
	return buildFieldDiffs(
		pickPublic(row.before, fields),
		pickPublic(row.after, fields) ?? {}
	).filter(
		(diff) =>
			(diff.before !== null || diff.after !== null) &&
			!(row.action !== 'create' && squash(diff.before) === squash(diff.after))
	);
}

// `nextOffset` is the raw-row cursor to resume from, null once the history runs out.
export async function scanPublicRows<T extends HistoryRow>(
	fetchBatch: (offset: number) => Promise<T[]>,
	{
		offset,
		want,
		batchSize,
		scanLimit
	}: { offset: number; want: number; batchSize: number; scanLimit: number }
): Promise<{ rows: T[]; nextOffset: number | null }> {
	const rows: T[] = [];
	let cursor = offset;
	while (cursor - offset < scanLimit) {
		const batch = await fetchBatch(cursor);
		for (const row of batch) {
			cursor += 1;
			if (publicChanges(row).length > 0) rows.push(row);
			if (rows.length >= want) return { rows, nextOffset: cursor };
		}
		if (batch.length < batchSize) return { rows, nextOffset: null };
	}
	return { rows, nextOffset: cursor };
}

export function toPublicHistoryEntry(
	row: HistoryRow,
	credits: readonly ProposalCredit[],
	accounts: readonly EditorAccount[]
): PublicHistoryEntry | null {
	const changes = publicChanges(row);
	if (changes.length === 0) return null;
	return {
		id: row.id,
		action: row.action,
		by: rowAuthor(row, credits, accounts),
		createdAt: toIsoTimestamp(row.createdAt),
		changes
	};
}
