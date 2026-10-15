/**
 * In-app announcements (#777). Cache-first like every other entity: PGlite
 * answers first, the network refreshes it, and an offline start still renders
 * the last fetched notices.
 */
import type { AnnouncementData } from '#lib/utils/types.js';
import { filterPublished, seenStampFor, unreadCount } from '../utils/announcements.js';
import { getAnnouncements } from '../utils/local/data/utils.js';
import { localTableSyncCheck, syncAnnouncements } from '../utils/local/data/sync.js';

const LAST_SEEN_KEY = 'announcements-last-seen';
const DISMISSED_KEY = 'announcements-dismissed';

function readNumber(key: string): number {
	try {
		const raw = Number(localStorage.getItem(key));
		return Number.isFinite(raw) ? raw : 0;
	} catch {
		return 0;
	}
}

function readIds(key: string): number[] {
	try {
		const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
		return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === 'number') : [];
	} catch {
		return [];
	}
}

function write(key: string, value: unknown) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// Private mode / storage full: the badge just won't persist.
	}
}

export default class AnnouncementsStore {
	items = $state.raw<AnnouncementData[]>([]);
	loading = $state(false);
	private lastSeenAt = $state(0);
	private dismissedIds = $state.raw<number[]>([]);
	private hydrated = false;

	unread = $derived(unreadCount(this.items, this.lastSeenAt));

	/** Newest live critical notice the user has not dismissed, for the chrome bar. */
	criticalNotice = $derived(
		this.items.find(
			(item) => item.severity === 'critical' && !this.dismissedIds.includes(item.id)
		) ?? null
	);

	/** Re-read persisted badge/dismissal state. Idempotent. */
	hydrate = () => {
		if (typeof localStorage === 'undefined') return;
		this.lastSeenAt = readNumber(LAST_SEEN_KEY);
		this.dismissedIds = readIds(DISMISSED_KEY);
	};

	/** Hydrate and kick off the first load. Safe to call repeatedly. */
	init = () => {
		if (this.hydrated || typeof localStorage === 'undefined') return;
		this.hydrated = true;
		this.hydrate();
		void this.load();
	};

	load = async () => {
		this.loading = true;
		try {
			const checker = await localTableSyncCheck('announcements');
			const { rows, source } = await getAnnouncements(checker);
			// The endpoint already filters, but cached rows can expire offline.
			// ponytail: filtered once per load, not on a timer — a tab left open
			// past an end date keeps showing it until the next load.
			this.items = filterPublished(rows);
			await syncAnnouncements(checker, rows, source === 'remote');
		} catch (error) {
			console.error('Failed to load announcements:', error);
		} finally {
			this.loading = false;
		}
	};

	/** Reading the panel clears the badge. */
	markSeen = () => {
		this.lastSeenAt = seenStampFor(this.items, this.lastSeenAt);
		write(LAST_SEEN_KEY, this.lastSeenAt);
	};

	dismissCritical = (id: number) => {
		if (this.dismissedIds.includes(id)) return;
		this.dismissedIds = [...this.dismissedIds, id];
		write(DISMISSED_KEY, this.dismissedIds);
	};
}
