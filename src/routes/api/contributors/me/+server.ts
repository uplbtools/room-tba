import { editorSessionOrUnauthorized } from '$lib/admin/require-editor';
import { checkRateLimit, clientIp, rateLimitResponse } from '$lib/api/rate-limit';
import {
	ContributorProfileError,
	getContributorProfileForOwner,
	replaceContributorProfile
} from '$lib/services/contribution/contributor-profile';
import type { RequestHandler } from './$types';

const MAX_BODY_BYTES = 32 * 1024;
const CONTRIBUTOR_PROFILE_ACCOUNT_LIMIT = {
	max: 20,
	windowMs: 10 * 60 * 1000
} as const;
const CONTRIBUTOR_PROFILE_IP_LIMIT = CONTRIBUTOR_PROFILE_ACCOUNT_LIMIT;
const RATE_LIMIT_MESSAGE = 'Too many profile updates. Wait a few minutes and try again.';
export const GET: RequestHandler = async ({ cookies }) => {
	const auth = await editorSessionOrUnauthorized(cookies);
	if (auth instanceof Response) return auth;

	try {
		const profile = await getContributorProfileForOwner(auth.session.id);
		if (!profile) return json({ error: 'Contributor profile not found.' }, 404);
		return json(profile);
	} catch (error) {
		if (error instanceof ContributorProfileError) return json({ error: error.message }, error.status);
		console.error('Load contributor profile failed:', error);
		return json({ error: 'Failed to load contributor profile.' }, 500);
	}
};

export const PUT: RequestHandler = async ({ cookies, request }) => {
	const auth = await editorSessionOrUnauthorized(cookies);
	if (auth instanceof Response) return auth;

	const ip = clientIp(request);
	const accountRate = checkRateLimit(
		`contributor-profile:account:${auth.session.id}`,
		CONTRIBUTOR_PROFILE_ACCOUNT_LIMIT.max,
		CONTRIBUTOR_PROFILE_ACCOUNT_LIMIT.windowMs
	);
	if (!accountRate.allowed) return rateLimitResponse(accountRate.resetAt, RATE_LIMIT_MESSAGE);
	const ipRate = checkRateLimit(
		`contributor-profile:ip:${ip}`,
		CONTRIBUTOR_PROFILE_IP_LIMIT.max,
		CONTRIBUTOR_PROFILE_IP_LIMIT.windowMs
	);
	if (!ipRate.allowed) return rateLimitResponse(ipRate.resetAt, RATE_LIMIT_MESSAGE);

	const contentLength = request.headers.get('content-length');
	if (contentLength) {
		const parsedLength = Number(contentLength);
		if (!Number.isFinite(parsedLength) || parsedLength > MAX_BODY_BYTES) {
			return json({ error: 'Profile update body is too large.' }, 413);
		}
	}

	let body: unknown;
	try {
		const raw = await request.text();
		if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
			return json({ error: 'Profile update body is too large.' }, 413);
		}
		body = JSON.parse(raw);
	} catch {
		return json({ error: 'Invalid JSON body.' }, 400);
	}

	try {
		const profile = await replaceContributorProfile(auth.session.id, body);
		return json(profile);
	} catch (error) {
		if (error instanceof ContributorProfileError) {
			if (error.latestEditable) {
				return json({ error: error.message, profile: error.latestEditable }, error.status);
			}
			return json({ error: error.message }, error.status);
		}
		console.error('Update contributor profile failed:', error);
		return json({ error: 'Failed to update contributor profile.' }, 500);
	}
};

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'private, no-store'
		}
	});
}
