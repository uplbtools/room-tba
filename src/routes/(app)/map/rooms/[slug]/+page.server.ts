import { error } from '@sveltejs/kit';
import { getRoomRouteSlug } from '#lib/utils/app-data.js';
import type { SeoData } from '#lib/components/seo/seo-data.js';
import { entityIndexPath, getRoomCanonicalPath } from '#lib/utils/entity/entity-urls.js';
import { parseIdRouteSlug } from '#lib/utils/route/route-slugs.js';
import { getRoomPageData } from '#lib/services/page-data/entity.js';
import {
	absoluteUrl,
	breadcrumbSchema,
	jsonLd,
	ogCardPath,
	ogImageUrl,
	webpageSchema
} from '#lib/utils/site.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const roomId = parseIdRouteSlug(params.slug);
	if (!roomId) error(404, 'Not Found');

	const appData = await getRoomPageData(roomId);
	if (appData === null) error(404, 'Not Found');

	const { room, classCount, termLabel } = appData;
	const termPhrase = termLabel ? ` for ${termLabel}` : '';
	const canonicalPath = getRoomCanonicalPath(room);
	const title = `${room.code} | Room at UPLB | Room TBA`;
	const description = room.building?.name
		? `Find ${room.code} at UPLB. View building context, directions, and ${classCount} listed class${classCount === 1 ? '' : 'es'}${termPhrase} in ${room.building.name} on Room TBA.`
		: `Find ${room.code} at UPLB with Room TBA. View room details and ${classCount} listed class${classCount === 1 ? '' : 'es'}${termPhrase}.`;

	const seo: SeoData = {
		title,
		description,
		canonicalPath,
		imagePath: ogCardPath({
			title: room.code,
			subtitle: `${room.building?.name ?? 'UPLB Los Baños'} · ${classCount} class${classCount === 1 ? '' : 'es'}${termLabel ? ` · ${termLabel}` : ''}`,
			kicker: 'Room at UPLB'
		}),
		structuredData: jsonLd(
			webpageSchema({ title, description, path: canonicalPath }),
			breadcrumbSchema([
				{ name: 'Home', path: '/' },
				{ name: 'Rooms', path: entityIndexPath('rooms') },
				{ name: room.code, path: canonicalPath }
			]),
			{
				'@context': 'https://schema.org',
				'@type': 'Place',
				name: room.code,
				description,
				url: absoluteUrl(canonicalPath),
				image: ogImageUrl(room.imageUrl ?? undefined),
				containedInPlace: room.building?.name
					? { '@type': 'Place', name: room.building.name }
					: undefined
			}
		)
	};

	return { seo, initialSearch: { category: 'room' as const, value: room.code } };
};
