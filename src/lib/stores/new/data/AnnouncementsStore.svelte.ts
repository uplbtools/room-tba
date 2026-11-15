import { readLocalJson, writeLocalJson } from '#lib/utils/locStorage.js';
import { seenStampFor, unreadCount, type AnnouncementWindow } from '#lib/utils/announcements.js';

const LAST_SEEN_KEY = 'announcements-last-seen';
const DISMISSED_KEY = 'announcements-dismissed';

export default class AnnouncementsStore {
	private lastSeenAt = $state(0);
	private dismissedIds = $state.raw<number[]>([]);

	hydrate() {
		this.lastSeenAt = Number(readLocalJson(LAST_SEEN_KEY, 0)) || 0;
		const ids = readLocalJson<unknown>(DISMISSED_KEY, []);
		this.dismissedIds = Array.isArray(ids) ? ids.filter((id) => typeof id === 'number') : [];
	}

	unread(items: AnnouncementWindow[]) {
		return unreadCount(items, this.lastSeenAt);
	}

	critical<T extends { id: number; severity: string }>(items: T[]) {
		return (
			items.find((item) => item.severity === 'critical' && !this.dismissedIds.includes(item.id)) ??
			null
		);
	}

	markSeen(items: AnnouncementWindow[]) {
		this.lastSeenAt = seenStampFor(items, this.lastSeenAt);
		writeLocalJson(LAST_SEEN_KEY, this.lastSeenAt);
	}

	dismissCritical(id: number) {
		if (this.dismissedIds.includes(id)) return;
		this.dismissedIds = [...this.dismissedIds, id];
		writeLocalJson(DISMISSED_KEY, this.dismissedIds);
	}
}
