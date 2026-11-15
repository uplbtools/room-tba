import { query } from '$app/server';
import { listPublishedAnnouncements } from '#lib/services/announcement.js';

export const getAnnouncements = query(() => listPublishedAnnouncements());
