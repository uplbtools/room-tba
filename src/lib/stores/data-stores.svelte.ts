import { getJSONFetch } from "../local/data/utils.js";
import { parseTermIdFromSearch, syncTermQueryParam } from "../term-url.js";
import {
  resolveDefaultTermFromList,
  resolveInitialTermId,
} from "../term-calendar.js";
import type { TermWithCount } from "@lib/types";
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
    const key = `${roomCode}::${termId ?? "all"}`;
    this._requestKey = key;

    const cached = this._cache.get(key);
    if (cached) {
      this.classes = cached;
      this.loading = false;
      return;
    }

    this.loading = true;
    try {
      const params = new URLSearchParams({ room_code: roomCode });
      if (termId != null) params.set("term_id", String(termId));
      const data = await getJSONFetch<ClassMapValue[]>(
        `/api/classes?${params.toString()}`,
      );
      this._cache.set(key, data);
      if (this._requestKey === key) this.classes = data;
    } catch (e) {
      console.error("Failed to load room classes:", e);
      if (this._requestKey === key) this.classes = [];
    } finally {
      if (this._requestKey === key) this.loading = false;
    }
  };

  clear = () => {
    this.classes = [];
    this._requestKey = null;
  };
}
