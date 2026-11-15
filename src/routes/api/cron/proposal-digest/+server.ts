import { cronAuthError } from '#lib/api/cron-auth.js';
import { json } from '#lib/api/json.js';
import { sendProposalDigest } from '#lib/services/email/digest.js';
import type { RequestHandler } from './$types';

/** Daily editor digest of pending proposals (#272). Invoked by Vercel Cron. */
export const GET: RequestHandler = async ({ request }) => {
	const denied = cronAuthError(request);
	if (denied) return denied;

	try {
		const result = await sendProposalDigest();
		return json({ success: true, ...result });
	} catch (error) {
		console.error('Proposal digest run failed:', error);
		return json({ error: 'Digest run failed.' }, 500);
	}
};
