/** Announcements CRUD + public read (#777). */
import { and, eq, sql } from 'drizzle-orm';
import { db } from '#lib/utils/db.js';
import { announcementsTable } from '#lib/server/db/schema.js';
import { normalizeAnnouncementSeverity } from '#lib/constants/announcement-severities.js';
import { filterPublished } from '#lib/utils/announcements.js';
import type { AnnouncementData } from '#lib/utils/types';
import { EditConflictError, refreshSyncKey } from './admin/actions';

export type AnnouncementUpdateInput = Partial<{
	title: string;
	body: string;
	severity: string;
	startsOn: string;
	endsOn: string | null;
	linkUrl: string | null;
	author: string | null;
}>;

export type AnnouncementCreateInput = AnnouncementUpdateInput & {
	title: string;
	body: string;
};

async function getAnnouncementById(id: number): Promise<AnnouncementData | null> {
	const [row] = await db
		.select()
		.from(announcementsTable)
		.where(eq(announcementsTable.id, id))
		.limit(1);
	return row ?? null;
}

/** Every row, newest first — editors only. */
export async function listAnnouncements(): Promise<AnnouncementData[]> {
	return db.select().from(announcementsTable).orderBy(sql`"starts_on" DESC, "id" DESC`);
}

/**
 * Rows inside their publish window, newest first.
 * ponytail: the window filter runs in JS (shared with the panel, so a cached
 * row that expires offline also disappears). Push it into SQL if this table
 * ever grows past a few hundred rows.
 */
export async function listPublishedAnnouncements(
	now: Date = new Date()
): Promise<AnnouncementData[]> {
	return filterPublished(await listAnnouncements(), now);
}

export async function createAnnouncement(
	input: AnnouncementCreateInput
): Promise<AnnouncementData | null> {
	const [inserted] = await db
		.insert(announcementsTable)
		.values({
			title: input.title.trim(),
			body: input.body.trim(),
			severity: normalizeAnnouncementSeverity(input.severity) ?? 'info',
			...(input.startsOn ? { startsOn: input.startsOn } : {}),
			endsOn: input.endsOn ?? null,
			linkUrl: input.linkUrl ?? null,
			author: input.author ?? null
		})
		.returning();
	await refreshSyncKey('announcements');
	return inserted ?? null;
}

export async function updateAnnouncement(
	id: number,
	input: AnnouncementUpdateInput,
	expectedVersion?: number
): Promise<AnnouncementData | null> {
	const updates: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(input)) {
		if (value !== undefined) updates[key] = value;
	}
	if (input.severity !== undefined) {
		updates.severity = normalizeAnnouncementSeverity(input.severity) ?? 'info';
	}
	if (Object.keys(updates).length === 0) return getAnnouncementById(id);

	const where =
		expectedVersion === undefined
			? eq(announcementsTable.id, id)
			: and(eq(announcementsTable.id, id), eq(announcementsTable.version, expectedVersion));
	const [updated] = await db
		.update(announcementsTable)
		.set({ ...updates, version: sql`"version" + 1`, updatedAt: sql`now()` })
		.where(where)
		.returning();

	if (!updated && expectedVersion !== undefined) {
		throw new EditConflictError(await getAnnouncementById(id));
	}
	await refreshSyncKey('announcements');
	return updated ?? (await getAnnouncementById(id));
}

/** Hard delete: announcements are ephemeral notices, not audited entities. */
export async function deleteAnnouncement(
	id: number,
	expectedVersion?: number
): Promise<AnnouncementData | null> {
	const where =
		expectedVersion === undefined
			? eq(announcementsTable.id, id)
			: and(eq(announcementsTable.id, id), eq(announcementsTable.version, expectedVersion));
	const [deleted] = await db.delete(announcementsTable).where(where).returning();
	if (!deleted && expectedVersion !== undefined) {
		const latest = await getAnnouncementById(id);
		if (latest) throw new EditConflictError(latest);
	}
	await refreshSyncKey('announcements');
	return deleted ?? null;
}
