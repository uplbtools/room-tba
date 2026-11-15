import { cronAuthError } from '#lib/api/cron-auth.js';
import { json } from '#lib/api/json.js';
import { retryDueNotifications } from '#lib/utils/notifications/outbox.js';
import type { RequestHandler } from './$types';

/** Retry Discord notifications that failed or never got their first try. Vercel Cron, every 10 minutes. */
export const GET: RequestHandler = async ({ request }) => {
	const denied = cronAuthError(request);
	if (denied) return denied;

	try {
		return json({ success: true, ...(await retryDueNotifications()) });
	} catch (error) {
		console.error('Notification outbox sweep failed:', error);
		return json({ error: 'Outbox sweep failed.' }, 500);
	}
};
