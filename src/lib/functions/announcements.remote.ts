import { query } from '$app/server';
import { listPublishedAnnouncements } from '#lib/services/announcement.js';

/** Published announcements for the announcement bar. */
export const getAnnouncements = query(() => listPublishedAnnouncements());
