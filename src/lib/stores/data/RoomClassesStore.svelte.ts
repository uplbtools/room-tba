import { getLocalClassesForRoom, getJSONFetch } from '#lib/utils/local/data/utils.js';
import type { ClassMapValue } from '#lib/utils/types';

export default class RoomClassesStore {
	classes = $state<ClassMapValue[]>([]);
	loading = $state(false);
	private _cache = new Map<string, ClassMapValue[]>();
	private _requestKey: string | null = null;

	load = async (roomCode: string, termId: number | null) => {
		if (termId == null) {
			this.clear();
			this.loading = false;
			return;
		}
		const key = `${roomCode}::${termId}`;
		this._requestKey = key;

		const cached = this._cache.get(key);
		if (cached) {
			this.classes = cached;
			this.loading = false;
			return;
		}

		// Cache-first (#415): paint PGlite rows immediately, then refresh from API.
		// Room schedules stay room-scoped — do not hydrate LEC/LAB siblings from
		// other rooms (see AGENTS.md / cadf0843).
		const local = await getLocalClassesForRoom(roomCode, termId);
		if (local !== null) {
			this.loading = local.length === 0;
			if (local.length > 0) {
				this._cache.set(key, local);
				if (this._requestKey === key) {
					this.classes = local;
					this.loading = false;
				}
				void this.#refreshFromApi(roomCode, termId, key);
				return;
			}
		}

		this.loading = true;
		try {
			const data = await this.#fetchRoomClasses(roomCode, termId);
			this._cache.set(key, data);
			if (this._requestKey === key) this.classes = data;
		} catch (e) {
			console.error('Failed to load room classes:', e);
			if (this._requestKey === key) this.classes = [];
		} finally {
			if (this._requestKey === key) this.loading = false;
		}
	};

	#fetchRoomClasses = async (roomCode: string, termId: number): Promise<ClassMapValue[]> => {
		const params = new URLSearchParams({
			room_code: roomCode,
			term_id: String(termId)
		});
		return getJSONFetch<ClassMapValue[]>(`/api/classes?${params.toString()}`);
	};

	#refreshFromApi = async (roomCode: string, termId: number, key: string) => {
		try {
			const data = await this.#fetchRoomClasses(roomCode, termId);
			this._cache.set(key, data);
			if (this._requestKey === key) this.classes = data;
		} catch {
			// Keep PGlite rows on background refresh failure.
		}
	};

	clear = () => {
		this.classes = [];
		this._requestKey = null;
	};
}
