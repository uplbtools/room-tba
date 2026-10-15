import { error } from '@sveltejs/kit';
import { ANTHROPIC_API_KEY } from '$app/env/private';
import {
	fetchCampusRoute,
	formatDistance,
	formatDuration
} from '#lib/utils/campus/campus-route.js';
import type { SeoData } from '#lib/components/seo/seo-data.js';
import { getBuildingCanonicalPath } from '#lib/utils/entity/entity-urls.js';
import { describeRoute, generateRouteDescription } from '#lib/utils/route/route-description.js';
import { getRoutePath } from '#lib/utils/route/route-links.js';
import { findBySlug, getRoutablePlaces } from '#lib/services/route.js';
import { breadcrumbSchema, jsonLd, webpageSchema } from '#lib/utils/site.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const places = await getRoutablePlaces();
	const from = findBySlug(places, params.from);
	const to = findBySlug(places, params.to);
	if (!from || !to) error(404, 'Not Found');

	const route = from.slug === to.slug ? null : await fetchCampusRoute(from, to, places);

	// The model only rewrites facts we computed. Without a key it is skipped and
	// the deterministic version ships, which is the normal case today.
	const aiDescription = route
		? await generateRouteDescription(from, to, route, ANTHROPIC_API_KEY)
		: null;
	const factual = route ? describeRoute(from, to, route) : null;

	const canonicalPath = getRoutePath(from.name, to.name);
	const title = `${from.name} to ${to.name} | Walking route at UPLB | Room TBA`;
	const summary = route
		? `${formatDistance(route.meters)}, about ${formatDuration(route.seconds)} walking.`
		: `Walking route between ${from.name} and ${to.name} at UPLB.`;
	const description = `How to walk from ${from.name} to ${to.name} at UP Los Banos. ${summary}`;

	const seo: SeoData = {
		title,
		description,
		canonicalPath,
		robots: 'noindex,follow',
		structuredData: jsonLd(
			webpageSchema({ title, description, path: canonicalPath }),
			breadcrumbSchema([
				{ name: 'Home', path: '/' },
				{ name: `${from.name} to ${to.name}`, path: canonicalPath }
			])
		)
	};

	return {
		seo,
		fromName: from.name,
		toName: to.name,
		samePlace: from.slug === to.slug,
		stats: route
			? { distance: formatDistance(route.meters), duration: formatDuration(route.seconds) }
			: null,
		aiDescription,
		steps: factual?.split('\n').slice(1) ?? [],
		mapUrl: `/?route=${encodeURIComponent(from.slug)},${encodeURIComponent(to.slug)}`,
		// Only buildings have a name-addressable page; dorms and places need ids
		// we did not fetch, so they simply get no context link.
		contextLinks: [from, to]
			.filter((place) => place.kind === 'building')
			.map((place) => ({
				label: `About ${place.name}`,
				href: getBuildingCanonicalPath(place.name)
			}))
	};
};
