import { parseRequiredEditorVersion } from '#lib/admin/expected-version.js';
import { editorSessionOrUnauthorized } from '#lib/admin/require-editor.js';
import { parseWallTimestamp } from '#lib/utils/announcements.js';
import { normalizeAnnouncementSeverity } from '#lib/constants/announcement-severities.js';
import { EditConflictError } from '#lib/services/admin/actions.js';
import {
	type AnnouncementUpdateInput,
	deleteAnnouncement,
	updateAnnouncement
} from '#lib/services/announcement.js';
import type { RequestHandler } from './$types';

type AnnouncementPatchBody = {
	title?: string;
	body?: string;
	severity?: string;
	startsOn?: string;
	endsOn?: string | null;
	linkUrl?: string | null;
	version?: number;
};

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

function parseAnnouncementId(value: string | undefined): number | null {
	const id = Number(value);
	return Number.isInteger(id) && id > 0 ? id : null;
}

function conflict(error: EditConflictError<unknown>) {
	return json(
		{
			error: 'This announcement was changed by another editor.',
			latest: error.latest
		},
		409
	);
}

export const PATCH: RequestHandler = async ({ cookies, params, request }) => {
	const auth = await editorSessionOrUnauthorized(cookies, {
		requirePublish: true
	});
	if (auth instanceof Response) return auth;

	const id = parseAnnouncementId(params.id);
	if (id === null) return json({ error: 'Invalid announcement ID' }, 400);

	let body: AnnouncementPatchBody;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, 400);
	}

	if (body.title !== undefined && !body.title.trim()) {
		return json({ error: 'Announcement title is required' }, 400);
	}
	if (body.body !== undefined && !body.body.trim()) {
		return json({ error: 'Announcement body is required' }, 400);
	}
	if (body.severity !== undefined && !normalizeAnnouncementSeverity(body.severity)) {
		return json({ error: 'Invalid severity' }, 400);
	}

	const parsedVersion = parseRequiredEditorVersion(body.version);
	if (!parsedVersion.ok) return parsedVersion.response;

	const updates: AnnouncementUpdateInput = {};
	if (body.title !== undefined) updates.title = body.title.trim();
	if (body.body !== undefined) updates.body = body.body.trim();
	if (body.severity !== undefined) updates.severity = body.severity;
	if (body.linkUrl !== undefined) updates.linkUrl = body.linkUrl || null;
	if (body.startsOn !== undefined) {
		const startsOn = parseWallTimestamp(body.startsOn);
		if (startsOn === null) return json({ error: 'Invalid start date' }, 400);
		updates.startsOn = startsOn;
	}
	if (body.endsOn !== undefined) {
		if (!body.endsOn) {
			updates.endsOn = null;
		} else {
			const endsOn = parseWallTimestamp(body.endsOn);
			if (endsOn === null) return json({ error: 'Invalid end date' }, 400);
			updates.endsOn = endsOn;
		}
	}

	try {
		const announcement = await updateAnnouncement(id, updates, parsedVersion.version);
		if (!announcement) return json({ error: 'Announcement not found' }, 404);
		return json({ success: true, announcement });
	} catch (error) {
		if (error instanceof EditConflictError) return conflict(error);
		console.error('Failed to update announcement:', error);
		return json({ error: 'Failed to save announcement' }, 500);
	}
};

export const DELETE: RequestHandler = async ({ cookies, params, request }) => {
	const auth = await editorSessionOrUnauthorized(cookies, {
		requirePublish: true
	});
	if (auth instanceof Response) return auth;

	const id = parseAnnouncementId(params.id);
	if (id === null) return json({ error: 'Invalid announcement ID' }, 400);

	const body = await request.json().catch(() => ({}) as { version?: number });
	const parsedVersion = parseRequiredEditorVersion(body.version);
	if (!parsedVersion.ok) return parsedVersion.response;

	try {
		const announcement = await deleteAnnouncement(id, parsedVersion.version);
		if (!announcement) return json({ error: 'Announcement not found' }, 404);
		return json({ success: true, announcement });
	} catch (error) {
		if (error instanceof EditConflictError) return conflict(error);
		console.error('Failed to delete announcement:', error);
		return json({ error: 'Failed to delete announcement' }, 500);
	}
};
