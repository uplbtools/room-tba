import type { SeoData } from '#lib/components/seo/seo-data.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store', 'referrer-policy': 'no-referrer' });
	const seo: SeoData = {
		title: 'Confirm your email | Room TBA',
		description: 'Confirm the email address on your Room TBA account.',
		canonicalPath: '/verify-email',
		robots: 'noindex,nofollow'
	};
	return { seo };
};
