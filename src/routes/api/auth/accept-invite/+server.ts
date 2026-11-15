import {
	canPublishDirectly,
	canReviewProposals,
	createSessionToken,
	setSessionCookie
} from '#lib/admin/auth.js';
import { clientIp, rateLimitResponse } from '#lib/api/rate-limit.js';
import { sharedRateLimit } from '#lib/api/rate-limit-db.js';
import { validateContributorSignup } from '#lib/auth/contributor-signup.js';
import { recordAudit } from '#lib/services/admin/audit-log.js';
import { acceptStaffInvite } from '#lib/services/admin/staff-invite.js';
import { AccountActionError } from '#lib/services/admin/user.js';
import type { RequestHandler } from './$types';

const LIMIT = { max: 8, windowMs: 60 * 1000 };

export const POST: RequestHandler = async ({ request }) => {
	const ip = clientIp(request);
	const rate = await sharedRateLimit(`accept-invite:${ip}`, LIMIT.max, LIMIT.windowMs);
	if (!rate.allowed) return rateLimitResponse(rate.resetAt);

	let body: { token?: unknown; username?: unknown; password?: unknown; displayName?: unknown };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, 400);
	}
	if (typeof body.token !== 'string' || !body.token) {
		return json({ error: 'This invite link is incomplete.' }, 400);
	}
	const valid = validateContributorSignup({
		username: body.username,
		password: body.password,
		displayName: body.displayName
	});
	if (!valid.ok) return json({ error: valid.error }, valid.status);

	try {
		const user = await acceptStaffInvite({
			token: body.token,
			username: valid.username,
			password: valid.password,
			displayName: valid.displayName
		});
		await recordAudit({
			action: 'user.invite_accepted',
			actorLabel: user.username,
			targetUserId: user.id,
			targetLabel: user.username,
			detail: { role: user.role },
			ip
		});
		return new Response(
			JSON.stringify({
				success: true,
				username: user.username,
				displayName: user.displayName,
				role: user.role,
				canPublish: canPublishDirectly(user.role),
				canReview: canReviewProposals(user.role)
			}),
			{
				status: 201,
				headers: {
					'Content-Type': 'application/json',
					'Set-Cookie': setSessionCookie(createSessionToken(user))
				}
			}
		);
	} catch (error) {
		if (error instanceof AccountActionError) {
			return json({ error: error.message }, error.status);
		}
		console.error('Accept invite failed:', error);
		return json({ error: "Couldn't finish the invite. Try again." }, 500);
	}
};

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}
