import type { EntityIndexItem, SeoData } from '#lib/components/seo/seo-data.js';
import { entityIndexPath, getEventCanonicalPath } from '#lib/utils/entity/entity-urls.js';
import { formatCampusDateLong } from '#lib/utils/event/event-time.js';
import { getSeoEvents } from '#lib/services/entity/event.js';
import { absoluteUrl, breadcrumbSchema, jsonLd, webpageSchema } from '#lib/utils/site.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const events = await getSeoEvents();
	const items: EntityIndexItem[] = events.map((event) => {
		const href = getEventCanonicalPath(event.slug);
		return {
			href,
			label: event.title,
			description: `${event.category} · ${formatCampusDateLong(event.occurrenceStartsAt)}`,
			copyUrl: absoluteUrl(href),
			copyLabel: `Copy link to ${event.title}`
		};
	});

	const title = 'UPLB events | Room TBA';
	const description =
		'Browse campus event map pages on Room TBA for seasonal UPLB markers, routes, and event-linked locations.';

	const seo: SeoData = {
		title,
		description,
		canonicalPath: entityIndexPath('events'),
		structuredData: jsonLd(
			webpageSchema({ title, description, path: entityIndexPath('events') }),
			breadcrumbSchema([
				{ name: 'Home', path: '/' },
				{ name: 'Events', path: entityIndexPath('events') }
			])
		)
	};

	return {
		// Tells the side panel this route owns its body.
		panel: 'browse' as const,
		seo,
		items,
		heading: 'UPLB event pages',
		intro:
			'Browse stable campus event pages. Each page opens the event result view with linked map markers and routes when available.'
	};
};
