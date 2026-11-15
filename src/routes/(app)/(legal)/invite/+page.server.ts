import type { SeoData } from '#lib/components/seo/seo-data.js';
import { findUsableInvite } from '#lib/services/admin/staff-invite.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store', 'referrer-policy': 'no-referrer' });
	const token = url.searchParams.get('token') ?? '';
	const invite = await findUsableInvite(token);
	const seo: SeoData = {
		title: 'Accept invite | Room TBA',
		description: 'Create your Room TBA editor account from an invite.',
		canonicalPath: '/invite',
		robots: 'noindex,nofollow'
	};
	return {
		seo,
		token: invite ? token : null,
		invite: invite && { email: invite.email, role: invite.role, displayName: invite.displayName }
	};
};
