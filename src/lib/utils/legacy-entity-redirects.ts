import type { Handle } from '@sveltejs/kit/hooks';
import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import {
	buildingsTable,
	collegesTable,
	divisionsTable,
	eventsTable
} from '#lib/server/db/schema.js';
import { db } from '#lib/utils/db.js';
import { MAP_BASE_PATH } from '#lib/utils/entity/entity-urls.js';
import { parseIdRouteSlug } from '#lib/utils/route/route-slugs.js';
import { slugifySegment } from '#lib/utils/site.js';

// Astro served entity pages at the site root by slug. They now live under the
// map by id, so the old links — shared, bookmarked, and indexed — need to keep resolving.
const LEGACY_SEGMENTS: Record<string, string> = {
	building: 'buildings',
	college: 'colleges',
	division: 'divisions',
	room: 'rooms',
	dorm: 'dorms',
	organization: 'organizations',
	unit: 'organizations',
	landmark: 'places',
	establishment: 'places',
	event: 'events',
	transit: 'transit',
	planner: 'planner'
};

const LEGACY_PATH_PATTERN = new RegExp(
	`^/(${Object.keys(LEGACY_SEGMENTS).join('|')})(?:/([^/]+))?(/.+)?$`
);

const NAMED_TABLES = {
	building: { table: buildingsTable, name: buildingsTable.buildingName },
	college: { table: collegesTable, name: collegesTable.collegeName },
	division: { table: divisionsTable, name: divisionsTable.divisionName }
};

async function findLegacyId(kind: string, slug: string): Promise<number | null> {
	if (/^\d+$/.test(slug)) return Number(slug);
	if (kind in NAMED_TABLES) {
		const { table, name } = NAMED_TABLES[kind as keyof typeof NAMED_TABLES];
		const rows = await db.select({ id: table.id, name }).from(table);
		return rows.find((row) => slugifySegment(row.name) === slug)?.id ?? null;
	}
	if (kind === 'event') {
		const [row] = await db
			.select({ id: eventsTable.id })
			.from(eventsTable)
			.where(eq(eventsTable.slug, slug))
			.limit(1);
		return row?.id ?? null;
	}
	return parseIdRouteSlug(slug);
}

export async function resolveLegacyEntityPath(pathname: string): Promise<string | null> {
	const match = pathname.replace(/\/+$/, '').match(LEGACY_PATH_PATTERN);
	if (!match) return null;
	const [, kind, slug, rest] = match;
	const index = `${MAP_BASE_PATH}/${LEGACY_SEGMENTS[kind]}`;
	if (!slug) return index;
	if (kind === 'transit') return `${index}/${slug}`;
	const id = await findLegacyId(kind, decodeURIComponent(slug));
	return id === null || rest ? index : `${index}/${id}`;
}

export const legacyEntityRedirects: Handle = async ({ event, resolve }) => {
	const target = await resolveLegacyEntityPath(event.url.pathname);
	if (target) {
		// 308: these are permanent moves, and the method must survive for the few
		// links that arrive as anything other than GET.
		redirect(308, `${target}${event.url.search}`);
	}
	return resolve(event);
};
