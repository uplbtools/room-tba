import { R2_PUBLIC_URL } from '$app/env/private';
import { editorSessionOrUnauthorized } from '#lib/admin/require-editor.js';
import { parseEventImageUrl } from '#lib/utils/r2-upload.js';
import {
	createEvent,
	DuplicateSlugError,
	type EventWriteInput
} from '#lib/services/admin/actions.js';
import { slugifySegment } from '#lib/utils/site.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, request }) => {
	const auth = await editorSessionOrUnauthorized(cookies, {
		requirePublish: true
	});
	if (auth instanceof Response) return auth;

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, 400);
	}

	const title = typeof body.title === 'string' ? body.title.trim() : '';
	if (!title) return json({ error: 'Event title is required' }, 400);
	if (typeof body.startsAt !== 'string' || typeof body.endsAt !== 'string') {
		return json({ error: 'Event start and end timestamps are required' }, 400);
	}

	const slug =
		typeof body.slug === 'string' && body.slug.trim()
			? slugifySegment(body.slug)
			: slugifySegment(title);
	const parsedImageUrl = parseEventImageUrl(body.imageUrl, R2_PUBLIC_URL);

	if (!parsedImageUrl.ok) {
		return json({ error: parsedImageUrl.error }, 400);
	}

	const input: EventWriteInput = {
		title,
		slug,
		startsAt: body.startsAt,
		endsAt: body.endsAt,
		includeInSeo: typeof body.includeInSeo === 'boolean' ? body.includeInSeo : true
	};

	if (typeof body.description === 'string') {
		input.description = body.description.trim() || null;
	}
	if (
		body.category === 'tradition' ||
		body.category === 'fair' ||
		body.category === 'ceremony' ||
		body.category === 'sports' ||
		body.category === 'other'
	) {
		input.category = body.category;
	}
	if (
		body.recurrence === 'none' ||
		body.recurrence === 'annual' ||
		body.recurrence === 'every_1st_sem' ||
		body.recurrence === 'every_2nd_sem'
	) {
		input.recurrence = body.recurrence;
	}
	if (typeof body.sourceUrl === 'string') {
		input.sourceUrl = body.sourceUrl.trim() || null;
	}
	if (typeof body.timezone === 'string' && body.timezone.trim()) {
		input.timezone = body.timezone.trim();
	}
	if (Array.isArray(body.locations)) {
		input.locations = body.locations as EventWriteInput['locations'];
	}
	if (Array.isArray(body.routes)) {
		input.routes = body.routes as EventWriteInput['routes'];
	}
	if (parsedImageUrl.provided) {
		input.imageUrl = parsedImageUrl.imageUrl;
	}

	try {
		const event = await createEvent(input, auth.editedBy);
		return json({ success: true, event }, 201);
	} catch (err) {
		if (err instanceof DuplicateSlugError) {
			return json({ error: err.message }, 409);
		}
		console.error('Failed to create event:', err);
		return json({ error: 'Failed to create event' }, 500);
	}
};

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}
