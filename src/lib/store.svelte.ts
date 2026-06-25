// src/lib/store.svelte.ts

import type { modalOptions } from "../constants/modal-states";
import { SvelteMap } from "svelte/reactivity";
import * as maplibre from "maplibre-gl";
import {
  RoomData,
  type ClassMapValue,
  type RecentSearch,
  type TermWithCount,
} from "./types";
import { getJSONFetch, getLocalRoomByCode } from "./local/data/utils";

export type DormFilterType = "all" | "up" | "private";
export type SyncInfo = {
  synced: number;
  total: number;
};

let _dormFilter = $state<DormFilterType>("all");
export const dormFilter = {
  get value() {
    return _dormFilter;
  },
  set(v: DormFilterType) {
    _dormFilter = v;
  },
};

let _currentRoom = $state<RoomData | null>(null);
export const currentRoom = {
  get value() {
    return _currentRoom;
  },
  async getRoomByCode(code: string) {
    _currentRoom = null;
    try {
      const localRoom = await getLocalRoomByCode(code);
      if (localRoom === null) {
        const codeParam = encodeURI(code.toUpperCase());
        const remoteRoomReq = await getJSONFetch<{ data: RoomData }>(
          `/api/rooms?code=${codeParam}`,
        );
        const remoteRoom = remoteRoomReq.data;
        _currentRoom = remoteRoom;
        return;
      }
      _currentRoom = localRoom;
    } catch (e) {
      console.error(e);
      _currentRoom = null;
    }
  },
  async getRoomFromSearch(room: RoomData) {
    _currentRoom = room;
  },
  setRoom(room: RoomData) {
    _currentRoom = room;
  },
};

interface ModalStoreState {
  open: boolean;
  type: (typeof modalOptions)[number] | null;
}

export interface QueryStoreState {
  type: "query" | "result";
  category:
    | "building"
    | "division"
    | "college"
    | "room"
    | "class"
    | "dorm"
    | null;
  value: string;
}

class ModalStore {
  private _modalStore: ModalStoreState = $state({
    open: false,
    type: null,
  });

  open = $derived(this._modalStore.open);
  type = $derived(this._modalStore.type);

  openModal = (type: ModalStoreState["type"]) => {
    this._modalStore.open = true;
    this._modalStore.type = type;
  };

  closeModal = () => {
    this._modalStore = {
      open: false,
      type: null,
    };
  };
}

class QueryStore {
  private _queryStore: QueryStoreState = $state({
    category: null,
    type: "query",
    value: "",
  });
  recentSearches: RecentSearch[] = $state([]);
  private _filters = new SvelteMap<
    string,
    Exclude<QueryStoreState["category"], null>
  >();
  inputValue = $state("");
  category = $derived(this._queryStore.category);
  type = $derived(this._queryStore.type);
  queryValue = $derived(this._queryStore.value);
  filterValues = $derived(
    Array.from(
      this._filters.entries().map(([value, category]) => ({
        category,
        value,
      })),
    ),
  );

  // onclick of query buttons
  updateQuery = (obj: QueryStoreState) => {
    this._queryStore = obj;
    this.inputValue = obj.value;

    if (obj.type === "result" && obj.category !== null) {
      this.addRecentSearch({
        category: obj.category,
        value: obj.value,
      });
    }
  };

  hydrateQuery = (obj: QueryStoreState) => {
    this._queryStore = obj;
    this.inputValue = obj.value;
  };

  addRecentSearch(recentSearch: RecentSearch) {
    const qIndex = this.recentSearches.findIndex(
      (query) =>
        query.value === recentSearch.value &&
        query.category === recentSearch.category,
    );
    if (qIndex !== -1) this.recentSearches.splice(qIndex, 1);
    else if (this.recentSearches.length > 4) this.recentSearches.pop();

    this.recentSearches.unshift(recentSearch);
  }

  removeRecentSearch(id: number) {
    this.recentSearches.splice(id, 1);
  }

  // when clicking the x button
  clearQuery = () => {
    this._queryStore = {
      category: null,
      type: "query",
      value: "",
    };
    this.inputValue = "";
  };

  setType = (type: QueryStoreState["type"]) => {
    this._queryStore.type = type;
  };

  setCategory = (category: QueryStoreState["category"]) => {
    this._queryStore.category = category;
  };

  addFilter = (
    key: string,
    category: Exclude<QueryStoreState["category"], null>,
  ) => {
    this._filters.set(key, category);
  };

  removeFilter = (key: string) => {
    this._filters.delete(key);
  };

  clearFilters = () => {
    this._filters.clear();
  };
}

class ToastStore {
  message: string | null = $state(null);
  type: "info" | "error" | "success" = $state("info");

  show = (message: string, type: "info" | "error" | "success" = "info") => {
    this.message = message;
    this.type = type;
  };

  clear = () => {
    this.message = null;
  };
}

class LocationStore {
  coords: [number, number] | null = $state(null);
  bearing: number | null = $state(null);
  isTracking: boolean = $state(false);
  destination: [number, number] | null = $state(null);
  routeOrigin: [number, number] | null = $state(null);
  private watchId: number | null = null;

  private readonly CAMPUS_BOUNDS = {
    minLng: 121.225963,
    minLat: 14.150106,
    maxLng: 121.254638,
    maxLat: 14.172678,
  };

  private isWithinBounds(lng: number, lat: number) {
    return (
      lng >= this.CAMPUS_BOUNDS.minLng &&
      lng <= this.CAMPUS_BOUNDS.maxLng &&
      lat >= this.CAMPUS_BOUNDS.minLat &&
      lat <= this.CAMPUS_BOUNDS.maxLat
    );
  }

  requestLocation = () => {
    if (!navigator.geolocation) {
      toastStore.show("Geolocation is not supported by your browser.", "error");
      return;
    }

    if (this.isTracking) {
      if (!this.coords) {
        toastStore.show("Still getting your location...", "info");
      }
      return;
    }

    this.isTracking = true;
    toastStore.show("Requesting location access...", "info");

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { longitude, latitude, heading } = position.coords;

        if (!this.isWithinBounds(longitude, latitude)) {
          toastStore.show(
            "You appear to be outside the UPLB Campus. Location features are limited to the campus area.",
            "error",
          );
          this.stopTracking();
          return;
        }

        const firstFix = !this.coords;
        this.coords = [longitude, latitude];
        this.bearing = heading;
        // Update route origin if destination exists but origin hasn't been set
        if (this.destination && !this.routeOrigin) {
          this.routeOrigin = [longitude, latitude];
        }

        if (firstFix) {
          toastStore.show("Location found!", "success");
        }
      },
      (error) => {
        let msg = "An unknown error occurred while getting location.";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = "Location access denied. Please enable it in your settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            msg = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            msg = "Location request timed out.";
            break;
        }
        toastStore.show(msg, "error");
        this.stopTracking();
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 },
    );
  };

  private stopTracking() {
    this.isTracking = false;
    this.coords = null;
    this.routeOrigin = null;
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  setDestination = (coords: [number, number]) => {
    this.destination = coords;
    this.routeOrigin = this.coords;
  };

  clearDestination = () => {
    this.destination = null;
    this.routeOrigin = null;
  };
}

class MapStore {
  mapInstance: maplibre.MapLibreMap | undefined = $state.raw();
}

class SidePanelStore {
  collapsed: boolean = $state(false);

  toggle = () => {
    this.collapsed = !this.collapsed;
  };

  expand = () => {
    this.collapsed = false;
  };

  collapse = () => {
    this.collapsed = true;
  };
}

class MapEditStore {
  enabled: boolean = $state(false);

  toggle = () => {
    this.enabled = !this.enabled;
  };

  close = () => {
    this.enabled = false;
  };
}

class Building3DStore {
  buildingName: string | null = $state(null);

  open = (name: string) => {
    this.buildingName = name;
  };

  close = () => {
    this.buildingName = null;
  };
}

class AdminAuthStore {
  isAdmin: boolean = $state(false);
  username: string | null = $state(null);
  loading: boolean = $state(false);
  loginOpen: boolean = $state(false);
  private _hydrated = false;

  hydrate = async () => {
    if (this._hydrated) return;
    this._hydrated = true;
    await this.refresh();
  };

  refresh = async () => {
    try {
      const res = await fetch("/api/admin/auth", {
        credentials: "same-origin",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        admin: boolean;
        username: string | null;
      };
      this.isAdmin = data.admin;
      this.username = data.username;
    } catch {
      // network error — treat as logged out, don't spam the UI.
      this.isAdmin = false;
      this.username = null;
    }
  };

  login = async (
    username: string,
    password: string,
  ): Promise<string | null> => {
    this.loading = true;
    try {
      const formData = new FormData();
      formData.set("password", password);

      const res = await fetch("/api/admin/auth", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });
      const data = await res
        .json()
        .catch(() => ({}) as { error?: string; username?: string });
      if (!res.ok) {
        return data.error ?? `Login failed (${res.status})`;
      }
      this.isAdmin = true;
      this.username = data.username ?? username ?? "admin";
      this.loginOpen = false;
      return null;
    } catch {
      return "Network error. Try again.";
    } finally {
      this.loading = false;
    }
  };

  logout = async () => {
    try {
      await fetch("/api/admin/auth", {
        method: "DELETE",
        credentials: "same-origin",
      });
    } catch {
      // ignore — we're going to clear local state regardless.
    }
    this.isAdmin = false;
    this.username = null;
  };

  openLogin = () => {
    this.loginOpen = true;
  };

  closeLogin = () => {
    this.loginOpen = false;
  };
}

class JeepneyStore {
  selectedRouteId: string | null = $state(null);
  menuOpen: boolean = $state(false);

  toggleMenu = () => {
    this.menuOpen = !this.menuOpen;
  };

  closeMenu = () => {
    this.menuOpen = false;
  };

  selectRoute = (id: string) => {
    this.selectedRouteId = this.selectedRouteId === id ? null : id;
    this.menuOpen = false;
  };

  clearRoute = () => {
    this.selectedRouteId = null;
  };
}

class SyncToastStore {
  private _buildings = $state<SyncInfo | null>(null);
  private _colleges = $state<SyncInfo | null>(null);
  private _divisions = $state<SyncInfo | null>(null);
  private _dorms = $state<SyncInfo | null>(null);
  public currentSyncData: SyncInfo | null = null;
  public currentSync = $state<string | null>(null);
  public allSynced = $derived<boolean>(
    this._buildings !== null &&
      this._colleges !== null &&
      this._divisions !== null &&
      this._dorms !== null &&
      this._buildings.total +
        this._colleges.total +
        this._divisions.total +
        this._dorms.total ===
        this._buildings.synced +
          this._colleges.synced +
          this._divisions.synced +
          this._dorms.synced,
  );

  startBuildingsSync(total: number) {
    this._buildings = {
      synced: 0,
      total,
    };
    this.currentSyncData = this._buildings;
    this.currentSync = "buildings";
  }
  startCollegesSync(total: number) {
    this._colleges = {
      synced: 0,
      total,
    };
    this.currentSyncData = this._colleges;
    this.currentSync = "colleges";
  }
  startDivisionsSync(total: number) {
    this._divisions = {
      synced: 0,
      total,
    };
    this.currentSyncData = this._divisions;
    this.currentSync = "divisions";
  }
  startDormsSync(total: number) {
    this._dorms = {
      synced: 0,
      total,
    };
    this.currentSyncData = this._dorms;
    this.currentSync = "dorms";
  }

  updateBuildingsSync() {
    if (this._buildings === null) return;
    this._buildings.synced++;
  }
  updateCollegesSync() {
    if (this._colleges === null) return;
    this._colleges.synced++;
  }
  updateDivisionsSync() {
    if (this._divisions === null) return;
    this._divisions.synced++;
  }
  updateDormsSync() {
    if (this._dorms === null) return;
    this._dorms.synced++;
  }
}

const ACTIVE_TERM_LS_KEY = "active-term-id";

class TermStore {
  terms = $state<TermWithCount[]>([]);
  activeTermId = $state<number | null>(null);
  loaded = $state(false);
  private _hydrated = false;

  activeTerm = $derived(
    this.terms.find((t) => t.id === this.activeTermId) ?? null,
  );

  init = async () => {
    if (this._hydrated) return;
    this._hydrated = true;
    try {
      const terms = await getJSONFetch<TermWithCount[]>("/api/terms");
      this.terms = terms;

      const storedRaw = localStorage.getItem(ACTIVE_TERM_LS_KEY);
      const stored = storedRaw !== null ? Number(storedRaw) : NaN;
      const storedValid =
        Number.isFinite(stored) && terms.some((t) => t.id === stored);

      const fallback =
        terms.find((t) => t.isDefault) ??
        terms.find((t) => t.isActive) ??
        terms[0] ??
        null;

      this.activeTermId = storedValid ? stored : (fallback?.id ?? null);
      this.loaded = true;
    } catch (e) {
      console.error("Failed to load terms:", e);
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
  };
}

/**
 * Classes for the currently viewed room, scoped to the active term. Results are
 * cached per `${roomCode}::${termId}` key so switching back and forth between
 * terms/rooms doesn't refetch (a clear, term-aware client cache).
 */
class RoomClassesStore {
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
      // Ignore responses for a room/term the user has since navigated away from.
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

export const queryStore = new QueryStore();
export const termStore = new TermStore();
export const roomClassesStore = new RoomClassesStore();
export const modalStore = new ModalStore();
export const toastStore = new ToastStore();
export const locationStore = new LocationStore();
export const mapStore = new MapStore();
export const sidePanelStore = new SidePanelStore();
export const mapEditStore = new MapEditStore();
export const jeepneyStore = new JeepneyStore();
export const syncToastStore = new SyncToastStore();
export const building3DStore = new Building3DStore();
export const adminAuthStore = new AdminAuthStore();
