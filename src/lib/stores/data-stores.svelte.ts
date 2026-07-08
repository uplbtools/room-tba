import {
  getJSONFetch,
  getBuildingIdsWithClasses,
} from "../local/data/utils.js";
import { parseTermIdFromSearch, syncTermQueryParam } from "../term-url.js";
import {
  resolveDefaultTermFromList,
  resolveInitialTermId,
} from "../term-calendar.js";
import type { TermWithCount } from "@lib/types";
import { missingParentLectures } from "../class-offering-groups.js";
import { fetchClassPage } from "../classes-api.js";
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
      // A lab/recit's parent lecture usually meets in a different room, so it
      // isn't in this room's list. Fetch those lectures so the offering
      // grouping can show each lab/recit alongside its lecture (#301).
      const withParents = await this.#addParentLectures(data, termId);
      this._cache.set(key, withParents);
      if (this._requestKey === key) this.classes = withParents;
    } catch (e) {
      console.error("Failed to load room classes:", e);
      if (this._requestKey === key) this.classes = [];
    } finally {
      if (this._requestKey === key) this.loading = false;
    }
  };

  // Fetch the parent lectures referenced by labs/recits in `roomClasses` that
  // aren't already present (they meet in other rooms) and merge them in.
  #addParentLectures = async (
    roomClasses: ClassMapValue[],
    termId: number | null,
  ): Promise<ClassMapValue[]> => {
    const missing = missingParentLectures(roomClasses);
    if (missing.length === 0) return roomClasses;

    const sectionsByCourse = new Map<string, Set<string>>();
    for (const { courseCode, section } of missing) {
      const set = sectionsByCourse.get(courseCode) ?? new Set<string>();
      set.add(section);
      sectionsByCourse.set(courseCode, set);
    }

    const haveIds = new Set(roomClasses.map((row) => row.id));
    const extra: ClassMapValue[] = [];
    await Promise.all(
      [...sectionsByCourse].map(async ([courseCode, sections]) => {
        try {
          const page = await fetchClassPage({
            termId,
            courseCodePrefix: courseCode,
            limit: 100,
          });
          for (const row of page.rows) {
            if (row.courseCode !== courseCode) continue;
            const section = (row.section ?? "").trim().toUpperCase();
            if (sections.has(section) && !haveIds.has(row.id)) {
              haveIds.add(row.id);
              extra.push(row);
            }
          }
        } catch {
          // Best effort — if a course fetch fails, omit that lecture rather
          // than failing the whole room load.
        }
      }),
    );

    return extra.length > 0 ? [...roomClasses, ...extra] : roomClasses;
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
