// src/lib/locStorage.ts

import type { RecentSearch } from '#lib/utils/types.js';

const RECENT_SEARCH_CATEGORIES = new Set([
	'building',
	'division',
	'college',
	'room',
	'class',
	'dorm',
	'event',
	'events'
]);

export const isRecentSearch = (recentSearch: unknown): recentSearch is RecentSearch =>
	!!recentSearch &&
	typeof recentSearch === 'object' &&
	'value' in recentSearch &&
	typeof (recentSearch as RecentSearch).value === 'string' &&
	'category' in recentSearch &&
	typeof (recentSearch as RecentSearch).category === 'string' &&
	RECENT_SEARCH_CATEGORIES.has((recentSearch as RecentSearch).category);

export function readLocalJson<T>(key: string, fallback: T): T {
	try {
		const raw = globalThis.localStorage?.getItem(key);
		return raw == null ? fallback : (JSON.parse(raw) as T);
	} catch {
		return fallback;
	}
}

export function writeLocalJson(key: string, value: unknown): void {
	try {
		globalThis.localStorage?.setItem(key, JSON.stringify(value));
	} catch {
		// storage blocked or full
	}
}
