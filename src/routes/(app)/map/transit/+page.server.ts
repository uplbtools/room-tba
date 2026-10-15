import type { SeoData } from '#lib/components/seo/seo-data.js';
import { JEEPNEY_ROUTES } from '#lib/constants/map/jeepney-routes.js';
import { breadcrumbSchema, jsonLd, ogCardPath, webpageSchema } from '#lib/utils/site.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const title = 'UPLB Jeepney Routes | Room TBA';
	const description =
		'Browse UPLB jeepney routes, stops, fares, and map paths for Kaliwa / Kanan and Forestry.';

	const seo: SeoData = {
		title,
		description,
		canonicalPath: '/transit/',
		imagePath: ogCardPath({
			title: 'UPLB Jeepney Routes',
			subtitle: JEEPNEY_ROUTES.map((route) => route.name).join(' · '),
			kicker: 'Transit at UPLB'
		}),
		structuredData: jsonLd(
			webpageSchema({ title, description, path: '/transit/' }),
			breadcrumbSchema([
				{ name: 'Home', path: '/' },
				{ name: 'Jeepney routes', path: '/transit/' }
			])
		)
	};

	return {
		seo,
		description,
		routes: JEEPNEY_ROUTES.map((route) => ({
			name: route.name,
			description: route.description
		}))
	};
};
