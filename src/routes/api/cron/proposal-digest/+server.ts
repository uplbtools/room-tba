import { timingSafeEqual } from 'node:crypto';
import { CRON_SECRET } from '$app/env/private';
import { sendProposalDigest } from '#lib/services/email/digest.js';
import type { RequestHandler } from './$types';

/** Daily editor digest of pending proposals (#272). Invoked by Vercel Cron. */
export const GET: RequestHandler = async ({ request }) => {
	if (!CRON_SECRET) {
		return json({ error: 'Cron is not configured on this server.' }, 503);
	}
	const authHeader = request.headers.get('authorization') ?? '';
	const expected = `Bearer ${CRON_SECRET}`;
	const authBuf = Buffer.from(authHeader);
	const expectedBuf = Buffer.from(expected);
	if (authBuf.length !== expectedBuf.length || !timingSafeEqual(authBuf, expectedBuf)) {
		return json({ error: 'Unauthorized' }, 401);
	}

	try {
		const result = await sendProposalDigest();
		return json({ success: true, ...result });
	} catch (error) {
		console.error('Proposal digest run failed:', error);
		return json({ error: 'Digest run failed.' }, 500);
	}
};

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}
