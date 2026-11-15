import { and, desc, eq, gte, inArray, or } from 'drizzle-orm';
import { db } from '#lib/server/db/index.js';
import { adminUsersTable, contributionsTable, editorHistoryTable } from '#lib/server/db/schema.js';
import {
	scanPublicRows,
	toPublicHistoryEntry,
	type EditorAccount,
	type HistoryRow,
	type ProposalCredit,
	type PublicHistoryEntry
} from '#lib/utils/editor/entity-attribution.js';

const PAGE_SIZE = 50;
// Private-only edits are filtered after the read, so a page can take several batches.
const SCAN_LIMIT = 500;

const historyColumns = {
	id: editorHistoryTable.id,
	entityType: editorHistoryTable.entityType,
	action: editorHistoryTable.action,
	editedBy: editorHistoryTable.editedBy,
	summary: editorHistoryTable.summary,
	before: editorHistoryTable.before,
	after: editorHistoryTable.after,
	createdAt: editorHistoryTable.createdAt
};

async function loadProposalCredits(
	entityType: string,
	entityId: number,
	rows: HistoryRow[]
): Promise<ProposalCredit[]> {
	const oldest = rows.reduce(
		(min, row) => (row.createdAt < min ? row.createdAt : min),
		rows[0]?.createdAt ?? ''
	);
	if (!oldest) return [];
	return db
		.select({
			entityType: contributionsTable.entityType,
			submitterName: contributionsTable.submitterName,
			createdAt: contributionsTable.createdAt
		})
		.from(contributionsTable)
		.where(
			and(
				eq(contributionsTable.source, 'proposal_approved'),
				gte(contributionsTable.createdAt, oldest),
				or(
					and(
						eq(contributionsTable.entityType, entityType),
						eq(contributionsTable.entityId, entityId)
					),
					and(
						eq(contributionsTable.entityType, `create_${entityType}`),
						eq(contributionsTable.entityId, 0)
					)
				)
			)
		);
}

async function loadEditorAccounts(rows: HistoryRow[]): Promise<EditorAccount[]> {
	const actors = [...new Set(rows.map((row) => row.editedBy))];
	if (actors.length === 0) return [];
	return db
		.select({
			username: adminUsersTable.username,
			displayName: adminUsersTable.displayName,
			showInCredits: adminUsersTable.showInCredits
		})
		.from(adminUsersTable)
		.where(
			or(inArray(adminUsersTable.username, actors), inArray(adminUsersTable.displayName, actors))
		);
}

export async function getPublicEntityHistory(
	entityType: string,
	entityId: number,
	offset: number
): Promise<{ entries: PublicHistoryEntry[]; nextOffset: number | null }> {
	const { rows, nextOffset } = await scanPublicRows(
		(cursor) =>
			db
				.select(historyColumns)
				.from(editorHistoryTable)
				.where(
					and(
						eq(editorHistoryTable.entityType, entityType),
						eq(editorHistoryTable.entityId, entityId)
					)
				)
				.orderBy(desc(editorHistoryTable.createdAt), desc(editorHistoryTable.id))
				.limit(PAGE_SIZE)
				.offset(cursor),
		{ offset, want: PAGE_SIZE, batchSize: PAGE_SIZE, scanLimit: SCAN_LIMIT }
	);
	const [credits, accounts] = await Promise.all([
		loadProposalCredits(entityType, entityId, rows),
		loadEditorAccounts(rows)
	]);
	return {
		entries: rows
			.map((row) => toPublicHistoryEntry(row, credits, accounts))
			.filter((entry): entry is PublicHistoryEntry => entry !== null),
		nextOffset
	};
}
