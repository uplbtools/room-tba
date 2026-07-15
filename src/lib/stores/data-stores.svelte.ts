import {
  getJSONFetch,
  getBuildingIdsWithClasses,
  getLocalClassesForRoom,
} from "../local/data/utils.js";
import { parseTermIdFromSearch, syncTermQueryParam } from "../term-url.js";
import {
  resolveDefaultTermFromList,
  resolveInitialTermId,
} from "../term-calendar.js";
import type { ClassMapValue, TermWithCount } from "@lib/types";
import { ACTIVE_TERM_LS_KEY } from "./store-types.js";

export class TermStore {
  terms = $state<TermWithCount[]>([]);
  activeTermId = $state<number | null>(null);
  loaded = $state(false);
  private _hydrated = false;

  activeTerm = $derived(
    this.terms.find((t) => t.id === this.activeTermId) ?? null,
  );

  defaultTermId = $derived(resolveDefaultTermFromList(this.terms)?.id ?? null);

  init = async () => {
    if (this._hydrated) return;
    this._hydrated = true;
    try {
      const terms = await getJSONFetch<TermWithCount[]>("/api/terms");
      this.terms = terms;

      const fromUrl =
        typeof window !== "undefined"
          ? parseTermIdFromSearch(window.location.search)
          : null;

      const storedRaw = localStorage.getItem(ACTIVE_TERM_LS_KEY);
      const stored = storedRaw !== null ? Number(storedRaw) : NaN;
      const storedId = Number.isFinite(stored) ? stored : null;

      const fallback = resolveDefaultTermFromList(terms);

      this.activeTermId = resolveInitialTermId(terms, {
        fromUrl,
        storedId,
      });
      this.loaded = true;

      syncTermQueryParam(this.activeTermId, fallback?.id ?? null);

      if (
        storedId !== null &&
        this.activeTermId !== null &&
        storedId !== this.activeTermId
      ) {
        try {
          localStorage.setItem(ACTIVE_TERM_LS_KEY, String(this.activeTermId));
        } catch {
          // ignore storage failures
        }
      }
    } catch (e) {
      console.error("Failed to load terms:", e);
    }
  };

  applyFromUrl = () => {
    if (typeof window === "undefined" || !this.loaded) return;
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

export class RoomClassesStore {
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
      console.error("Failed to load room classes:", e);
      if (this._requestKey === key) this.classes = [];
    } finally {
      if (this._requestKey === key) this.loading = false;
    }
  };

  #fetchRoomClasses = async (
    roomCode: string,
    termId: number,
  ): Promise<ClassMapValue[]> => {
    const params = new URLSearchParams({
      room_code: roomCode,
      term_id: String(termId),
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

/**
 * Building ids that host classes for the active term. Powers the dual-role
 * filter: an admin building that also hosts classes surfaces under both the
 * "Administrative" and "Class" building filters. Reload on term change and
 * after an offline sync so the set stays current.
 */
export class ClassVenuesStore {
  buildingIdsWithClasses = $state<Set<number>>(new Set());
  private _requestId = 0;

  load = async (termId: number | null) => {
    const requestId = ++this._requestId;
    try {
      const set = await getBuildingIdsWithClasses(termId);
      // Ignore stale responses if a newer load started meanwhile.
      if (requestId === this._requestId) this.buildingIdsWithClasses = set;
    } catch (e) {
      console.error("Failed to load class venues:", e);
    }
  };
}
