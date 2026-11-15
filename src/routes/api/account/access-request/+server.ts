import { editorSessionOrUnauthorized } from '#lib/admin/require-editor.js';
import { clientIp, rateLimitResponse } from '#lib/api/rate-limit.js';
import { sharedRateLimit } from '#lib/api/rate-limit-db.js';
import { createAccessRequest, getMyAccessRequest } from '#lib/services/admin/access-request.js';
import { recordAudit } from '#lib/services/admin/audit-log.js';
import { AccountActionError } from '#lib/services/admin/user.js';
import type { RequestHandler } from './$types';

const LIMIT = { max: 3, windowMs: 10 * 60 * 1000 };

export const GET: RequestHandler = async ({ cookies }) => {
	const auth = await editorSessionOrUnauthorized(cookies);
	if (auth instanceof Response) return auth;
	return json({ request: await getMyAccessRequest(auth.session.id) });
};

export const POST: RequestHandler = async ({ cookies, request }) => {
	const auth = await editorSessionOrUnauthorized(cookies);
	if (auth instanceof Response) return auth;

	const rate = await sharedRateLimit(
		`access-request:${auth.session.id}`,
		LIMIT.max,
		LIMIT.windowMs
	);
	if (!rate.allowed) return rateLimitResponse(rate.resetAt);

	let body: { message?: unknown };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, 400);
	}
	try {
		const created = await createAccessRequest(
			auth.session,
			typeof body.message === 'string' ? body.message : ''
		);
		await recordAudit({
			action: 'access.requested',
			actor: auth.session,
			targetUserId: auth.session.id,
			targetLabel: auth.session.username,
			ip: clientIp(request)
		});
		return json({ success: true, request: created }, 201);
	} catch (error) {
		if (error instanceof AccountActionError) {
			return json({ error: error.message }, error.status);
		}
		console.error('Create access request failed:', error);
		return json({ error: "Couldn't send the request. Try again." }, 500);
	}
};

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' }
	});
}
