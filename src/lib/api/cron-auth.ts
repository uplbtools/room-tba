import { timingSafeEqual } from 'node:crypto';
import { CRON_SECRET } from '$app/env/private';
import { json } from './json';

/** A 503 or 401 response unless the request carries the Vercel Cron secret. */
export function cronAuthError(request: Request): Response | null {
	if (!CRON_SECRET) return json({ error: 'Cron is not configured on this server.' }, 503);
	const auth = Buffer.from(request.headers.get('authorization') ?? '');
	const expected = Buffer.from(`Bearer ${CRON_SECRET}`);
	if (auth.length !== expected.length || !timingSafeEqual(auth, expected)) {
		return json({ error: 'Unauthorized' }, 401);
	}
	return null;
}
