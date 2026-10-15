import { error } from '@sveltejs/kit';
import type { SeoData } from '#lib/components/seo/seo-data.js';
import { entityIndexPath, getEventCanonicalPath } from '#lib/utils/entity/entity-urls.js';
import { getEventImage } from '#lib/utils/event/event-images.js';
import { formatCampusDateTime } from '#lib/utils/event/event-time.js';
import { getEventPageData } from '#lib/services/page-data/entity.js';
import {
	absoluteUrl,
	breadcrumbSchema,
	jsonLd,
	ogCardPath,
	webpageSchema
} from '#lib/utils/site.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const appData = await getEventPageData(params.slug);
	if (appData === null) error(404, 'Not Found');

	const { event } = appData;
	const eventImage = getEventImage(event.slug, event.imageUrl, event.title);
	const canonicalPath = getEventCanonicalPath(event.slug);
	const title = `${event.title} | UPLB event | Room TBA`;
	const description =
		event.description ??
		`Open ${event.title} on Room TBA for event-linked UPLB map markers and routes.`;

	const primaryLocation =
		event.locations.find((location) => location.isPrimary) ?? event.locations[0] ?? null;

	const seo: SeoData = {
		title,
		ogTitle: event.title,
		description,
		canonicalPath,
		imagePath: ogCardPath({
			title: event.title,
			subtitle: `${formatCampusDateTime(event.occurrenceStartsAt)}${primaryLocation ? ` · ${primaryLocation.resolvedLabel}` : ''}`,
			kicker: 'Event at UPLB'
		}),
		structuredData: jsonLd(
			webpageSchema({ title, description, path: canonicalPath }),
			breadcrumbSchema([
				{ name: 'Home', path: '/' },
				{ name: 'Events', path: entityIndexPath('events') },
				{ name: event.title, path: canonicalPath }
			]),
			{
				'@context': 'https://schema.org',
				'@type': 'Event',
				name: event.title,
				description,
				url: absoluteUrl(canonicalPath),
				startDate: event.occurrenceStartsAt,
				endDate: event.occurrenceEndsAt,
				image: eventImage ? absoluteUrl(eventImage.src) : undefined,
				eventStatus: 'https://schema.org/EventScheduled',
				eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
				location:
					primaryLocation &&
					primaryLocation.resolvedLat !== null &&
					primaryLocation.resolvedLon !== null
						? {
								'@type': 'Place',
								name: primaryLocation.resolvedLabel,
								geo: {
									'@type': 'GeoCoordinates',
									latitude: primaryLocation.resolvedLat,
									longitude: primaryLocation.resolvedLon
								}
							}
						: undefined
			}
		)
	};

	return {
		seo,
		title: event.title,
		description,
		startsAtLabel: formatCampusDateTime(event.occurrenceStartsAt),
		locationLabel: primaryLocation?.resolvedLabel ?? null,
		initialSearch: {
			category: 'event' as const,
			value: event.title,
			eventSlug: event.slug
		}
	};
};
