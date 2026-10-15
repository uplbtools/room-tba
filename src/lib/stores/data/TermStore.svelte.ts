import { getJSONFetch } from '#lib/utils/local/data/utils.js';
import { resolveDefaultTermFromList, resolveInitialTermId } from '#lib/utils/term/term-calendar.js';
import { parseTermIdFromSearch, syncTermQueryParam } from '#lib/utils/term/term-url.js';
import type { TermWithCount } from '#lib/utils/types';
import { ACTIVE_TERM_LS_KEY } from '../store-types';

export default class TermStore {
	terms = $state<TermWithCount[]>([]);
	activeTermId = $state<number | null>(null);
	loaded = $state(false);
	private _hydrated = false;

	activeTerm = $derived(this.terms.find((t) => t.id === this.activeTermId) ?? null);

	defaultTermId = $derived(resolveDefaultTermFromList(this.terms)?.id ?? null);

	init = async () => {
		if (this._hydrated) return;
		this._hydrated = true;
		try {
			const terms = await getJSONFetch<TermWithCount[]>('/api/terms');
			this.terms = terms;

			const fromUrl =
				typeof window !== 'undefined' ? parseTermIdFromSearch(window.location.search) : null;

			const storedRaw = localStorage.getItem(ACTIVE_TERM_LS_KEY);
			const stored = storedRaw !== null ? Number(storedRaw) : NaN;
			const storedId = Number.isFinite(stored) ? stored : null;

			const fallback = resolveDefaultTermFromList(terms);

			this.activeTermId = resolveInitialTermId(terms, {
				fromUrl,
				storedId
			});
			this.loaded = true;

			syncTermQueryParam(this.activeTermId, fallback?.id ?? null);

			if (storedId !== null && this.activeTermId !== null && storedId !== this.activeTermId) {
				try {
					localStorage.setItem(ACTIVE_TERM_LS_KEY, String(this.activeTermId));
				} catch {
					// ignore storage failures
				}
			}
		} catch (e) {
			console.error('Failed to load terms:', e);
		}
	};

	applyFromUrl = () => {
		if (typeof window === 'undefined' || !this.loaded) return;
		const fromUrl = parseTermIdFromSearch(window.location.search);
		if (fromUrl !== null && this.terms.some((term) => term.id === fromUrl)) {
			this.activeTermId = fromUrl;
			try {
				localStorage.setItem(ACTIVE_TERM_LS_KEY, String(fromUrl));
			} catch {
				// ignore storage failures
			}
		}
	};

	setTerm = (id: number) => {
		this.activeTermId = id;
		try {
			localStorage.setItem(ACTIVE_TERM_LS_KEY, String(id));
		} catch {
			// localStorage may be unavailable (private mode); selection still works
			// for the current session.
		}
		syncTermQueryParam(id, this.defaultTermId);
	};
}
