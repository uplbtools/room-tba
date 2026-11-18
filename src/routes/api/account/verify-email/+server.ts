import { clientIp, rateLimitResponse } from '#lib/api/rate-limit.js';
import { sharedRateLimit } from '#lib/api/rate-limit-db.js';
import { AccountActionError, verifyEmailToken } from '#lib/services/admin/user.js';
import type { RequestHandler } from './$types';

const LIMIT = { max: 10, windowMs: 60 * 1000 };

/** POST, not GET, so a mail scanner that prefetches the link can't spend the token. */
export const POST: RequestHandler = async ({ request }) => {
	const rate = await sharedRateLimit(
		`account-verify-email:${clientIp(request)}`,
		LIMIT.max,
		LIMIT.windowMs
	);
	if (!rate.allowed) return rateLimitResponse(rate.resetAt);

	let body: { token?: unknown };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, 400);
	}
	if (typeof body.token !== 'string' || !body.token) {
		return json({ error: 'This link is invalid or has expired.' }, 400);
	}

	try {
		await verifyEmailToken(body.token);
		return json({ success: true });
	} catch (error) {
		if (error instanceof AccountActionError) {
			return json({ error: error.message }, error.status);
		}
		console.error('Verify email failed:', error);
		return json({ error: "Couldn't confirm your email. Try again." }, 500);
	}
};

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' }
	});
}
