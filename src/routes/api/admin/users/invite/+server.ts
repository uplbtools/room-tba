import { editorSessionOrUnauthorized } from '#lib/admin/require-editor.js';
import { clientIp } from '#lib/api/rate-limit.js';
import { recordAudit } from '#lib/services/admin/audit-log.js';
import { createStaffInvite, revokeInvite } from '#lib/services/admin/staff-invite.js';
import { AccountActionError } from '#lib/services/admin/user.js';
import type { RequestHandler } from './$types';

const ROLES = ['admin', 'editor', 'contributor'] as const;

export const POST: RequestHandler = async ({ cookies, request }) => {
	const auth = await editorSessionOrUnauthorized(cookies, { requireAdmin: true });
	if (auth instanceof Response) return auth;

	let body: { email?: unknown; role?: unknown; displayName?: unknown };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, 400);
	}
	const role = ROLES.find((r) => r === body.role);
	if (typeof body.email !== 'string' || !role) {
		return json({ error: 'email and a valid role are required.' }, 400);
	}

	try {
		const created = await createStaffInvite({
			email: body.email,
			role,
			displayName: typeof body.displayName === 'string' ? body.displayName : null,
			invitedBy: auth.session
		});
		await recordAudit({
			action: 'user.invited',
			actor: auth.session,
			targetLabel: created.invite.email,
			detail: { role, emailed: created.emailed },
			ip: clientIp(request)
		});
		return json({ success: true, ...created }, 201);
	} catch (error) {
		if (error instanceof AccountActionError) {
			return json({ error: error.message }, error.status);
		}
		console.error('Create staff invite failed:', error);
		return json({ error: "Couldn't create invite." }, 500);
	}
};

export const DELETE: RequestHandler = async ({ cookies, url }) => {
	const auth = await editorSessionOrUnauthorized(cookies, { requireAdmin: true });
	if (auth instanceof Response) return auth;
	const id = Number(url.searchParams.get('id'));
	if (!Number.isInteger(id) || id < 1) return json({ error: 'Invalid invite ID' }, 400);
	await revokeInvite(id);
	return json({ success: true });
};

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}
