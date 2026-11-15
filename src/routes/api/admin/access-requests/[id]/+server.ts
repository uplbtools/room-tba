import { editorSessionOrUnauthorized } from '#lib/admin/require-editor.js';
import { clientIp } from '#lib/api/rate-limit.js';
import { decideAccessRequest } from '#lib/services/admin/access-request.js';
import { recordAudit } from '#lib/services/admin/audit-log.js';
import { AccountActionError } from '#lib/services/admin/user.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, params, request }) => {
	const auth = await editorSessionOrUnauthorized(cookies, { requireAdmin: true });
	if (auth instanceof Response) return auth;

	const id = Number(params.id);
	if (!Number.isInteger(id) || id < 1) return json({ error: 'Invalid request ID' }, 400);
	let body: { decision?: unknown };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, 400);
	}
	if (body.decision !== 'approved' && body.decision !== 'declined') {
		return json({ error: 'decision must be approved or declined.' }, 400);
	}
	try {
		const decided = await decideAccessRequest(id, body.decision, auth.session);
		const ip = clientIp(request);
		await recordAudit({
			action: body.decision === 'approved' ? 'access.approved' : 'access.declined',
			actor: auth.session,
			targetUserId: decided.userId,
			targetLabel: decided.username,
			detail: { requestId: id },
			ip
		});
		if (body.decision === 'approved') {
			await recordAudit({
				action: 'user.role_changed',
				actor: auth.session,
				targetUserId: decided.userId,
				targetLabel: decided.username,
				detail: { from: 'contributor', to: 'editor', via: 'access-request' },
				ip
			});
		}
		return json({ success: true });
	} catch (error) {
		if (error instanceof AccountActionError) {
			return json({ error: error.message }, error.status);
		}
		console.error('Decide access request failed:', error);
		return json({ error: "Couldn't update the request." }, 500);
	}
};

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}
