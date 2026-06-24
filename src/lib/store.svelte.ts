// src/lib/store.svelte.ts

import type { modalOptions } from "../constants/modal-states";
import { SvelteMap } from "svelte/reactivity";
import * as maplibre from "maplibre-gl";
import { RoomData, type RecentSearch } from "./types";
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

export const queryStore = new QueryStore();
export const modalStore = new ModalStore();
export const toastStore = new ToastStore();
export const locationStore = new LocationStore();
export const mapStore = new MapStore();
export const mapEditStore = new MapEditStore();
export const jeepneyStore = new JeepneyStore();
export const syncToastStore = new SyncToastStore();
export const building3DStore = new Building3DStore();
export const adminAuthStore = new AdminAuthStore();
