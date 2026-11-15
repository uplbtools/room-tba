import type { SeoData } from '#lib/components/seo/seo-data.js';
import { verifySignedToken } from '#lib/admin/signed-token.js';
import type { PageServerLoad } from './$types';

function tokenLooksValid(token: string) {
	try {
		return verifySignedToken<{ purpose?: string }>(token)?.purpose === 'password-reset';
	} catch {
		return false;
	}
}

export const load: PageServerLoad = ({ url, setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store', 'referrer-policy': 'no-referrer' });
	const token = url.searchParams.get('token');
	const tokenState = !token ? 'missing' : tokenLooksValid(token) ? 'ok' : 'invalid';
	const seo: SeoData = {
		title: 'Reset password | Room TBA',
		description: 'Set a new password for your Room TBA editor account.',
		canonicalPath: '/reset-password',
		robots: 'noindex,nofollow'
	};
	return { seo, token: tokenState === 'ok' ? token : null, tokenState };
};
