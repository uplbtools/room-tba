import { ContributorProfileError } from '$lib/services/contribution/contributor-profile';

const MAX_REASON_LENGTH = 500;
const MAX_BODY_BYTES = 8 * 1024;

export function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

export function parsePositiveId(value: string | undefined): number | null {
	if (!value || !/^\d+$/u.test(value)) return null;
	const id = Number(value);
	return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function errorFromContributorProfile(error: unknown): Response | null {
	if (!(error instanceof ContributorProfileError)) return null;
	const body: { error: string; profile?: unknown } = { error: error.message };
	if (error.latestEditable) body.profile = error.latestEditable;
	return json(body, error.status);
}

export function serverError(message: string, error: unknown): Response {
	console.error(message, error);
	return json({ error: message }, 500);
}

export async function readReason(request: Request): Promise<{ ok: true; reason: string } | { ok: false; response: Response }> {
	const contentLength = request.headers.get('content-length');
	if (contentLength) {
		const parsedLength = Number(contentLength);
		if (!Number.isFinite(parsedLength) || parsedLength > MAX_BODY_BYTES) {
			return { ok: false, response: json({ error: 'Moderation request body is too large.' }, 413) };
		}
	}

	let raw: string;
	try {
		raw = await request.text();
	} catch {
		return { ok: false, response: json({ error: 'Invalid request body.' }, 400) };
	}
	if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
		return { ok: false, response: json({ error: 'Moderation request body is too large.' }, 413) };
	}

	let body: unknown;
	try {
		body = JSON.parse(raw);
	} catch {
		return { ok: false, response: json({ error: 'Invalid JSON body.' }, 400) };
	}
	if (!body || typeof body !== 'object' || Array.isArray(body)) {
		return { ok: false, response: json({ error: 'Request body must be an object.' }, 400) };
	}
	if (Object.keys(body).some((key) => key !== 'reason')) {
		return { ok: false, response: json({ error: 'Unknown moderation field.' }, 400) };
	}
	const reason = 'reason' in body ? body.reason : undefined;
	if (typeof reason !== 'string' || !reason.trim()) {
		return { ok: false, response: json({ error: 'Moderation reason is required.' }, 400) };
	}
	const normalized = reason.trim();
	if (normalized.length > MAX_REASON_LENGTH) {
		return { ok: false, response: json({ error: `Moderation reason cannot exceed ${MAX_REASON_LENGTH} characters.` }, 400) };
	}
	return { ok: true, reason: normalized };
}

export function parsePaginationParam(raw: string | null, name: 'limit' | 'offset'): number | null {
	if (raw === null || raw.trim() === '') return null;
	if (!/^\d+$/u.test(raw.trim())) return Number.NaN;
	const value = Number(raw.trim());
	if (!Number.isSafeInteger(value) || value < 0) return Number.NaN;
	if (name === 'limit' && value > 100) return Number.NaN;
	if (name === 'offset' && value > 100_000) return Number.NaN;
	return value;
}
