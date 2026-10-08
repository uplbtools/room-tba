import { error } from '@sveltejs/kit';
import type { SeoData } from '$lib/components/seo/seo-data';
import { getPublicContributorProfile, normalizeContributorSlug } from '$lib/services/contribution/contributor-profile';
import { absoluteUrl, breadcrumbSchema, jsonLd, webpageSchema } from '$lib/utils/site';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store' });

	let slug: string;
	try {
		slug = normalizeContributorSlug(params.slug);
	} catch {
		error(404, 'Not Found');
	}

	const profile = await getPublicContributorProfile(slug);
	if (!profile) error(404, 'Not Found');

	const canonicalPath = `/contributor/${profile.slug}`;
	const title = `${profile.displayName} | Room TBA Contributor`;
	const description = profile.bio
		? `${profile.displayName} is a ${profile.role.toLowerCase()} contributing to Room TBA at UPLB. ${profile.bio}`
		: `${profile.displayName} is a ${profile.role.toLowerCase()} contributing to Room TBA at UPLB.`;
	const seo: SeoData = {
		title,
		ogTitle: `${profile.displayName} | Room TBA`,
		description,
		canonicalPath,
		imagePath: profile.avatarUrl ?? '/profile.svg',
		structuredData: jsonLd(
			webpageSchema({ title, description, path: canonicalPath }),
			breadcrumbSchema([
				{ name: 'Home', path: '/' },
				{ name: 'Contributors', path: '/contributor/' },
				{ name: profile.displayName, path: canonicalPath }
			]),
			{
				'@context': 'https://schema.org',
				'@type': 'ProfilePage',
				name: title,
				description,
				url: absoluteUrl(canonicalPath),
				mainEntity: {
					'@type': 'Person',
					name: profile.displayName,
					jobTitle: profile.role,
					description: profile.bio || undefined,
					image: absoluteUrl(profile.avatarUrl ?? '/profile.svg'),
					sameAs: profile.socialLinks.map((link) => link.url)
				}
			}
		)
	};

	return { profile, seo };
};
