import { readLocalJson, writeLocalJson } from '#lib/utils/locStorage.js';

export type SavedPlace = { href: string; label: string; at: number };

// ponytail: new keys, main's entries are keyed by name and can't be opened by id
const SAVED_KEY = 'saved-places-v2';
const RECENT_KEY = 'recent-places-v2';
const SAVED_LIMIT = 200;
const RECENT_LIMIT = 10;

function load(key: string, limit: number): SavedPlace[] {
	const raw = readLocalJson<unknown>(key, []);
	if (!Array.isArray(raw)) return [];
	return raw
		.filter(
			(p): p is SavedPlace =>
				typeof p?.href === 'string' && typeof p.label === 'string' && typeof p.at === 'number'
		)
		.slice(0, limit);
}

function upsertFront(list: SavedPlace[], href: string, label: string, limit: number) {
	return [{ href, label, at: Date.now() }, ...list.filter((p) => p.href !== href)].slice(0, limit);
}

export default class SavedPlacesStore {
	saved = $state.raw<SavedPlace[]>([]);
	recent = $state.raw<SavedPlace[]>([]);

	hydrate() {
		this.saved = load(SAVED_KEY, SAVED_LIMIT);
		this.recent = load(RECENT_KEY, RECENT_LIMIT);
	}

	isSaved(href: string) {
		return this.saved.some((p) => p.href === href);
	}

	toggle(href: string, label: string) {
		const wasSaved = this.isSaved(href);
		this.saved = wasSaved
			? this.saved.filter((p) => p.href !== href)
			: upsertFront(this.saved, href, label, SAVED_LIMIT);
		writeLocalJson(SAVED_KEY, this.saved);
		return !wasSaved;
	}

	record(href: string, label: string) {
		this.recent = upsertFront(this.recent, href, label, RECENT_LIMIT);
		writeLocalJson(RECENT_KEY, this.recent);
	}

	clearRecent() {
		this.recent = [];
		writeLocalJson(RECENT_KEY, []);
	}
}
