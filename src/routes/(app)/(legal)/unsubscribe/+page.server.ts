import type { SeoData } from '#lib/components/seo/seo-data.js';
import { readUnsubscribeToken } from '#lib/services/email/unsubscribe.js';
import { EMAIL_TOPIC_LABELS } from '#lib/utils/email/unsubscribe-core.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url, setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store', 'referrer-policy': 'no-referrer' });
	const token = url.searchParams.get('token') ?? '';
	const target = readUnsubscribeToken(token);
	const seo: SeoData = {
		title: 'Unsubscribe | Room TBA',
		description: 'Stop Room TBA notification emails.',
		canonicalPath: '/unsubscribe',
		robots: 'noindex,nofollow'
	};
	return {
		seo,
		token: target ? token : null,
		topic: target ? EMAIL_TOPIC_LABELS[target.topic] : ''
	};
};
