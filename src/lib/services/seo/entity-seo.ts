import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { SeoData } from '#lib/components/seo/seo-data.js';
import {
	buildingsTable,
	collegesTable,
	divisionsTable,
	dormsTable,
	eventsTable,
	organizationsTable,
	placesTable,
	roomsTable
} from '#lib/server/db/schema.js';
import { db } from '#lib/utils/db.js';
import { entityIndexPath, entityPath } from '#lib/utils/entity/entity-urls.js';
import { breadcrumbSchema, jsonLd, ogCardPath, webpageSchema } from '#lib/utils/site.js';

const KINDS = {
	buildings: {
		table: buildingsTable,
		name: buildingsTable.buildingName,
		about: buildingsTable.directions,
		label: 'Building',
		index: 'Buildings'
	},
	rooms: {
		table: roomsTable,
		name: roomsTable.code,
		about: roomsTable.directions,
		label: 'Room',
		index: 'Rooms'
	},
	colleges: {
		table: collegesTable,
		name: collegesTable.collegeName,
		about: null,
		label: 'College',
		index: 'Colleges'
	},
	divisions: {
		table: divisionsTable,
		name: divisionsTable.divisionName,
		about: null,
		label: 'Division',
		index: 'Divisions'
	},
	dorms: {
		table: dormsTable,
		name: dormsTable.dormName,
		about: dormsTable.description,
		label: 'Dorm',
		index: 'Dorms'
	},
	organizations: {
		table: organizationsTable,
		name: organizationsTable.name,
		about: organizationsTable.description,
		label: 'Organization',
		index: 'Organizations'
	},
	places: {
		table: placesTable,
		name: placesTable.name,
		about: placesTable.description,
		label: 'Place',
		index: 'Places'
	},
	events: {
		table: eventsTable,
		name: eventsTable.title,
		about: eventsTable.description,
		label: 'Event',
		index: 'Events'
	}
};

export async function loadEntitySeo(segment: keyof typeof KINDS, rawId: string) {
	const id = Number(rawId);
	if (!Number.isInteger(id) || id < 1) error(404, 'Not Found');

	const kind = KINDS[segment];
	const [row] = await db
		.select({ name: kind.name, ...(kind.about ? { about: kind.about } : {}) })
		.from(kind.table)
		.where(eq(kind.table.id, id))
		.limit(1);
	if (!row) error(404, 'Not Found');

	const canonicalPath = entityPath(segment, id);
	const title = `${row.name} | ${kind.label} at UPLB | Room TBA`;
	const about = 'about' in row && typeof row.about === 'string' ? row.about.trim() : '';
	const description = about
		? `${row.name} at UP Los Baños. ${about}`.slice(0, 160)
		: `Find ${row.name} on the Room TBA map of UP Los Baños.`;

	const seo: SeoData = {
		title,
		ogTitle: row.name,
		description,
		canonicalPath,
		imagePath: ogCardPath({ title: row.name, kicker: `${kind.label} at UPLB` }),
		structuredData: jsonLd(
			webpageSchema({ title, description, path: canonicalPath }),
			breadcrumbSchema([
				{ name: 'Home', path: '/' },
				{ name: kind.index, path: entityIndexPath(segment) },
				{ name: row.name, path: canonicalPath }
			])
		)
	};
	return { seo };
}
