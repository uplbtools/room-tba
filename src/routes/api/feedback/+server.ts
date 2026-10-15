import { json } from '@sveltejs/kit';
import { ASTRO_E2E_SKIP_LOGIN_RATE_LIMIT } from '$app/env/private';
import { db } from '#lib/server/db/index.js';
import { feedbackTable } from '#lib/server/db/schema.js';
import type { RequestHandler } from './$types';

// Caps inlined from astro/src/constants/feedback.ts.
const FEEDBACK_MESSAGE_MAX = 2000;
const FEEDBACK_CONTACT_MAX = 120;

// Validation + rate limiting inlined from astro/src/lib/api/feedback.ts.
const SCREEN_MAX = 200;
const APP_VERSION_MAX = 32;
/** Hard cap on the request body, checked before parsing JSON. */
const FEEDBACK_MAX_BODY_BYTES = 16 * 1024;

const SHORT_WINDOW_MS = 10 * 60 * 1000;
const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
const IP_SHORT_MAX = 5;
const IP_DAILY_MAX = 25;

const RATE_LIMIT_MESSAGE =
	'Thanks — that is a lot of feedback at once. Try again in a few minutes.';

// Best-effort in-memory limiter (per server instance), inlined from
// astro/src/lib/api/rate-limit.ts.
const buckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(
	key: string,
	max: number,
	windowMs: number,
	now = Date.now()
): { allowed: boolean; resetAt: number } {
	const bucket = buckets.get(key);
	if (!bucket || now >= bucket.resetAt) {
		const resetAt = now + windowMs;
		buckets.set(key, { count: 1, resetAt });
		return { allowed: true, resetAt };
	}

	if (bucket.count >= max) {
		return { allowed: false, resetAt: bucket.resetAt };
	}

	bucket.count += 1;
	return { allowed: true, resetAt: bucket.resetAt };
}

/** Same E2E escape hatch the proposal limiter uses, so specs can submit freely. */
function skipRateLimits(): boolean {
	return ASTRO_E2E_SKIP_LOGIN_RATE_LIMIT === '1';
}

/**
 * Per-IP only — feedback is anonymous, so there is no account to key on. The IP
 * is used for the in-memory bucket and never stored.
 */
function enforceFeedbackLimits(
	ip: string,
	now = Date.now()
): { allowed: false; resetAt: number } | null {
	if (skipRateLimits()) return null;

	const short = checkRateLimit(`feedback:ip:${ip}`, IP_SHORT_MAX, SHORT_WINDOW_MS, now);
	if (!short.allowed) return { allowed: false, resetAt: short.resetAt };

	const daily = checkRateLimit(`feedback:daily:ip:${ip}`, IP_DAILY_MAX, DAILY_WINDOW_MS, now);
	if (!daily.allowed) return { allowed: false, resetAt: daily.resetAt };

	return null;
}

/**
 * Content-Length is a hint, not a guarantee, but rejecting an oversized declared
 * body avoids parsing megabytes of JSON before the length check below runs.
 */
function isFeedbackBodyTooLarge(contentLength: string | null): boolean {
	const declared = Number(contentLength);
	return Number.isFinite(declared) && declared > FEEDBACK_MAX_BODY_BYTES;
}

type FeedbackSubmission = {
	message: string;
	contact: string | null;
	screen: string | null;
	appVersion: string | null;
	wasOnline: boolean | null;
};

type FeedbackValidation =
	| { ok: true; value: FeedbackSubmission }
	| { ok: false; error: string; status: 400 | 413 };

function optionalText(value: unknown, max: number): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	return trimmed.slice(0, max);
}

function validateFeedback(body: unknown): FeedbackValidation {
	if (!body || typeof body !== 'object' || Array.isArray(body)) {
		return { ok: false, error: 'Invalid feedback payload.', status: 400 };
	}

	const raw = body as Record<string, unknown>;
	const message = typeof raw.message === 'string' ? raw.message.trim() : '';

	if (!message) {
		return { ok: false, error: 'Message is required.', status: 400 };
	}
	if (message.length > FEEDBACK_MESSAGE_MAX) {
		return {
			ok: false,
			error: `Message is too long (max ${FEEDBACK_MESSAGE_MAX} characters).`,
			status: 413
		};
	}

	// Only a same-site path is kept: a full URL could carry a query string with
	// whatever the sender had typed into search, which is not ours to store.
	const screenRaw = optionalText(raw.screen, SCREEN_MAX);

	const screen =
		screenRaw?.startsWith('/') && !screenRaw.startsWith('//')
			? (screenRaw.split('?')[0] ?? null)
			: null;

	return {
		ok: true,
		value: {
			message,
			contact: optionalText(raw.contact, FEEDBACK_CONTACT_MAX),
			screen,
			appVersion: optionalText(raw.appVersion, APP_VERSION_MAX),
			wasOnline: typeof raw.wasOnline === 'boolean' ? raw.wasOnline : null
		}
	};
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	// The IP keys an in-memory bucket only; it is never written to the table.
	const denied = enforceFeedbackLimits(getClientAddress());
	if (denied) {
		const retryAfter = Math.max(1, Math.ceil((denied.resetAt - Date.now()) / 1000));
		return json(
			{ error: RATE_LIMIT_MESSAGE },
			{
				status: 429,
				headers: { 'Retry-After': String(retryAfter) }
			}
		);
	}

	if (isFeedbackBodyTooLarge(request.headers.get('content-length'))) {
		return json({ error: 'Message is too long.' }, { status: 413 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const validated = validateFeedback(body);
	if (!validated.ok) {
		return json({ error: validated.error }, { status: validated.status });
	}

	try {
		const [row] = await db
			.insert(feedbackTable)
			.values(validated.value)
			.returning({ id: feedbackTable.id });
		if (!row) throw new Error('Insert returned no row');
	} catch (e) {
		console.error(e);
		return json(
			{
				error: 'Could not send your message. Try again, or reach us on Discord or Messenger.'
			},
			{ status: 500 }
		);
	}

	// TODO: emit feedback-submitted notification (astro/src/lib/notifications/feedback-events.ts)

	return json({ success: true }, { status: 201 });
};
