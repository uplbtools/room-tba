import { untrack } from "svelte";
import { readLocalJson, writeLocalJson } from "@lib/locStorage";
import { dismissEphemeralOverlays } from "@lib/overlay-stack";
import { jeepneyStore, queryStore } from "@lib/store.svelte";

/** Entity sheets that can be saved: the query category that reopens them. */
export type SavedPlaceCategory = "building" | "room" | "dorm" | "place";

/**
 * Enough to list and reopen a place without loading any data: `value` is the
 * query value the sheet opens with (building/dorm/place name, room code).
 */
export type SavedPlace = {
  category: SavedPlaceCategory;
  value: string;
  label: string;
  /** Short context line, e.g. "Class building" or the room's building. */
  subtitle?: string | null;
  lat?: number | null;
  lon?: number | null;
  /** Epoch ms when saved / last viewed. */
  at: number;
};

export type SavedPlaceInput = Omit<SavedPlace, "at">;

const CATEGORIES = new Set<string>(["building", "room", "dorm", "place"]);

export const SAVED_PLACES_KEY = "saved-places";
export const RECENT_PLACES_KEY = "recent-places";
export const SAVED_PLACES_LIMIT = 200;
export const RECENT_PLACES_LIMIT = 10;

export function savedPlaceKey(
  place: Pick<SavedPlace, "category" | "value">,
): string {
  return `${place.category}:${place.value}`;
}

export function isSavedPlace(value: unknown): value is SavedPlace {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<SavedPlace>;
  return (
    typeof v.category === "string" &&
    CATEGORIES.has(v.category) &&
    typeof v.value === "string" &&
    v.value.length > 0 &&
    typeof v.label === "string" &&
    typeof v.at === "number"
  );
}

/** Move (or add) `place` to the front, dropping duplicates and the overflow. */
export function upsertFront(
  list: readonly SavedPlace[],
  place: SavedPlace,
  limit: number,
): SavedPlace[] {
  const key = savedPlaceKey(place);
  return [place, ...list.filter((p) => savedPlaceKey(p) !== key)].slice(
    0,
    limit,
  );
}

class PlaceList {
  items = $state<SavedPlace[]>([]);
  #keys = $derived(new Set(this.items.map(savedPlaceKey)));

  constructor(
    private readonly storageKey: string,
    private readonly limit: number,
  ) {
    this.load();
  }

  /** Re-read storage (another tab, or tests resetting it). */
  load() {
    const raw = readLocalJson<unknown>(this.storageKey, []);
    this.items = Array.isArray(raw)
      ? raw.filter(isSavedPlace).slice(0, this.limit)
      : [];
  }

  has(category: SavedPlaceCategory, value: string): boolean {
    return this.#keys.has(savedPlaceKey({ category, value }));
  }

  protected put(place: SavedPlaceInput) {
    // Callers run this from effects; reading `items` must not subscribe them.
    const next = untrack(() =>
      upsertFront(this.items, { ...place, at: Date.now() }, this.limit),
    );
    this.commit(next);
  }

  remove(category: SavedPlaceCategory, value: string) {
    const key = savedPlaceKey({ category, value });
    this.commit(
      untrack(() => this.items.filter((p) => savedPlaceKey(p) !== key)),
    );
  }

  clear() {
    this.commit([]);
  }

  private commit(next: SavedPlace[]) {
    this.items = next;
    writeLocalJson(this.storageKey, next);
  }
}

class SavedPlacesStore extends PlaceList {
  save(place: SavedPlaceInput) {
    this.put(place);
  }

  /** Returns the new saved state. */
  toggle(place: SavedPlaceInput): boolean {
    if (untrack(() => this.has(place.category, place.value))) {
      this.remove(place.category, place.value);
      return false;
    }
    this.put(place);
    return true;
  }
}

class RecentPlacesStore extends PlaceList {
  record(place: SavedPlaceInput) {
    this.put(place);
  }
}

/** Places the user starred, newest first. Device-local (no account needed). */
export const savedPlaces = new SavedPlacesStore(
  SAVED_PLACES_KEY,
  SAVED_PLACES_LIMIT,
);

/** Last few place sheets opened, newest first. */
export const recentPlaces = new RecentPlacesStore(
  RECENT_PLACES_KEY,
  RECENT_PLACES_LIMIT,
);

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === SAVED_PLACES_KEY) savedPlaces.load();
    if (event.key === RECENT_PLACES_KEY) recentPlaces.load();
  });
}

/**
 * Reopen a saved or recent place. The side panel resolves its sheet from the
 * query category, so setting the query is the whole job (same as deep links).
 */
export function openSavedPlace(place: Pick<SavedPlace, "category" | "value">) {
  dismissEphemeralOverlays();
  jeepneyStore.closeStop();
  queryStore.updateQuery({
    type: "result",
    category: place.category,
    value: place.value,
  });
  queryStore.inputValue = place.value;
}
