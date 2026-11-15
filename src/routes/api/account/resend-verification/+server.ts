import { editorSessionOrUnauthorized } from '#lib/admin/require-editor.js';
import { rateLimitResponse } from '#lib/api/rate-limit.js';
import { sharedRateLimit } from '#lib/api/rate-limit-db.js';
import { sendEmailVerification } from '#lib/services/admin/user.js';
import type { RequestHandler } from './$types';

const LIMIT = { max: 1, windowMs: 2 * 60 * 1000 };

export const POST: RequestHandler = async ({ cookies }) => {
	const auth = await editorSessionOrUnauthorized(cookies);
	if (auth instanceof Response) return auth;

	const rate = await sharedRateLimit(
		`account-resend-verification:${auth.session.id}`,
		LIMIT.max,
		LIMIT.windowMs
	);
	if (!rate.allowed) {
		return rateLimitResponse(
			rate.resetAt,
			'A link was sent a moment ago. Check your inbox, or try again in two minutes.'
		);
	}

	if (!(await sendEmailVerification(auth.session.id))) {
		return json(
			{
				error:
					'Could not send a confirmation link. Your email may already be confirmed, or mail is unavailable right now.'
			},
			409
		);
	}
	return json({ success: true });
};

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' }
	});
}
