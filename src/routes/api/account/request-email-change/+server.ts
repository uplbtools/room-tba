import { editorSessionOrUnauthorized } from '#lib/admin/require-editor.js';
import { checkRateLimit, clientIp, rateLimitResponse } from '#lib/api/rate-limit.js';
import { AccountActionError, requestEmailChange } from '#lib/services/admin/user.js';
import type { RequestHandler } from './$types';

const LIMIT = { max: 5, windowMs: 60 * 1000 };

export const POST: RequestHandler = async ({ cookies, request }) => {
	const auth = await editorSessionOrUnauthorized(cookies);
	if (auth instanceof Response) return auth;

	const rate = checkRateLimit(
		`account-request-email-change:${auth.session.id}:${clientIp(request)}`,
		LIMIT.max,
		LIMIT.windowMs
	);
	if (!rate.allowed) return rateLimitResponse(rate.resetAt);

	let body: { newEmail?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, 400);
	}

	if (typeof body.newEmail !== 'string') {
		return json({ error: 'newEmail is required.' }, 400);
	}

	try {
		await requestEmailChange(auth.session.id, body.newEmail);
		return json({ success: true });
	} catch (error) {
		if (error instanceof AccountActionError) {
			return json({ error: error.message }, error.status);
		}
		console.error('Request email change failed:', error);
		return json({ error: 'Failed to send confirmation email.' }, 500);
	}
};

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}
