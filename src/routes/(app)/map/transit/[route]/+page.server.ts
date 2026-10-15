import type { SeoData } from '#lib/components/seo/seo-data.js';
import { JEEPNEY_ROUTES } from '#lib/constants/map/jeepney-routes.js';
import { breadcrumbSchema, jsonLd, ogCardPath, webpageSchema } from '#lib/utils/site.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	// Astro rendered a generic page for an unknown id rather than 404ing; the
	// map still opens, so the behaviour is kept.
	const route = JEEPNEY_ROUTES.find((entry) => entry.id === params.route);
	const routeName = route?.name ?? 'UPLB jeepney route';
	const canonicalPath = `/transit/${encodeURIComponent(params.route)}/`;
	const title = `${routeName} | UPLB Transit | Room TBA`;
	const description =
		route?.description ?? 'View this UPLB jeepney route, its stops, and map context in Room TBA.';

	const seo: SeoData = {
		title,
		ogTitle: routeName,
		description,
		canonicalPath,
		imagePath: ogCardPath({
			title: routeName,
			subtitle: route
				? `${route.stops.length} stops · PHP ${route.fare.regular} regular · PHP ${route.fare.discounted} discounted`
				: 'Transit at UPLB',
			kicker: 'Transit at UPLB'
		}),
		structuredData: jsonLd(
			webpageSchema({ title, description, path: canonicalPath }),
			breadcrumbSchema([
				{ name: 'Home', path: '/' },
				{ name: 'Jeepney routes', path: '/transit/' },
				{ name: routeName, path: canonicalPath }
			])
		)
	};

	return {
		seo,
		routeName,
		description,
		stopCount: route?.stops.length ?? null,
		regularFare: route?.fare.regular ?? null
	};
};
