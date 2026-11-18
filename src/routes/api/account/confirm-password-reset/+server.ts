import { clientIp, rateLimitResponse } from '#lib/api/rate-limit.js';
import { sharedRateLimit } from '#lib/api/rate-limit-db.js';
import { recordAudit } from '#lib/services/admin/audit-log.js';
import { AccountActionError, confirmPasswordReset } from '#lib/services/admin/user.js';
import type { RequestHandler } from './$types';

const LIMIT = { max: 8, windowMs: 60 * 1000 };

export const POST: RequestHandler = async ({ request }) => {
	const rate = await sharedRateLimit(
		`account-confirm-password-reset:${clientIp(request)}`,
		LIMIT.max,
		LIMIT.windowMs
	);
	if (!rate.allowed) return rateLimitResponse(rate.resetAt);

	let body: { token?: string; newPassword?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, 400);
	}

	if (typeof body.token !== 'string' || typeof body.newPassword !== 'string') {
		return json({ error: 'token and newPassword are required.' }, 400);
	}

	try {
		const userId = await confirmPasswordReset(body.token, body.newPassword);
		await recordAudit({
			action: 'password.reset_completed',
			targetUserId: userId,
			ip: clientIp(request)
		});
		return json({ success: true });
	} catch (error) {
		if (error instanceof AccountActionError) {
			return json({ error: error.message }, error.status);
		}
		console.error('Confirm password reset failed:', error);
		return json({ error: "Couldn't reset password." }, 500);
	}
};

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}
