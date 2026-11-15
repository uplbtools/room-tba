import { json } from '@sveltejs/kit';
import { listPublishedAnnouncements } from '#lib/services/announcement.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		return json(await listPublishedAnnouncements());
	} catch (e) {
		console.error('Failed to load announcements:', e);
		return json([]);
	}
};
