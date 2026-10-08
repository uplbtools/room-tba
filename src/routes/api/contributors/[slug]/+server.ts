import { json } from '@sveltejs/kit';
import { getPublicContributorProfile, normalizeContributorSlug } from '$lib/services/contribution/contributor-profile';
import type { RequestHandler } from './$types';

const NO_STORE_HEADERS = {
	'cache-control': 'private, no-store',
	'content-type': 'application/json'
};


export const GET: RequestHandler = async ({ params }) => {
	let slug: string;
	try {
		slug = normalizeContributorSlug(params.slug);
	} catch {
		return json({ error: 'Not Found' }, { status: 404, headers: NO_STORE_HEADERS });
	}

	const profile = await getPublicContributorProfile(slug);
	if (!profile) return json({ error: 'Not Found' }, { status: 404, headers: NO_STORE_HEADERS });

	return json(
		{
			slug: profile.slug,
			displayName: profile.displayName,
			role: profile.role,
			bio: profile.bio,
			avatarUrl: profile.avatarUrl,
			socialLinks: profile.socialLinks.map(({ kind, label, url }) => ({ kind, label, url }))
		},
		{ headers: NO_STORE_HEADERS }
	);
};
