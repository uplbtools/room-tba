// src/lib/store.svelte.ts

import { modalOptions } from "@constants/modal-states";
import {
  DEFAULT_TERRAIN_EXAGGERATION,
  CAMPUS_BOUNDS,
} from "@constants/map-terrain";
import { SvelteMap } from "svelte/reactivity";
import * as maplibre from "maplibre-gl";
import { getJSONFetch, getLocalRoomByCode } from "./local/data/utils";
import { parseTermIdFromSearch, syncTermQueryParam } from "./term-url";
import {
  resolveDefaultTermFromList,
  resolveInitialTermId,
} from "./term-calendar";
import {
  AVG_TILE_BYTES,
  clearMapCaches,
  getCampusTileCoords,
  getStorageUsage,
  getTileTemplate,
  MIN_ZOOM,
  tileUrl,
} from "./local/offline-maps";
import { clearProposeEventDraft } from "./contributor-drafts";
import type { BuildingTypeFilter } from "@constants/building-types";

export type { BuildingTypeFilter };

type RoomData = {
  id: number;
  code: string;
  directions: string | null;
  building: {
    name: string;
    lat: number | null;
    lon: number | null;
    directions: string | null;
  } | null;
  buildingId: number | null;
  collegeId: number | null;
  divisionId: number | null;
  collegeName: string | null;
  divisionName: string | null;
  version: number;
  updatedAt: string;
};

export type DormFilterType = "all" | "up" | "private";
export type SyncInfo = {
  synced: number;
  total: number;
};

export type SyncTableKey =
  | "buildings"
  | "colleges"
  | "divisions"
  | "dorms"
  | "events"
  | "aliases"
  | "rooms";

export type SyncActivity = "idle" | "checking" | "fetching" | "writing";

const SYNC_TABLE_LABELS: Record<SyncTableKey, string> = {
  buildings: "building list",
  colleges: "colleges",
  divisions: "divisions",
  dorms: "dorms",
  events: "events",
  aliases: "search aliases",
  rooms: "room stats",
};

export function syncTableLabel(table: SyncTableKey): string {
  return SYNC_TABLE_LABELS[table];
}

let _dormFilter = $state<DormFilterType>("all");
export const dormFilter = {
  get value() {
    return _dormFilter;
  },
  set(v: DormFilterType) {
    _dormFilter = v;
  },
};

let _buildingTypeFilter = $state<BuildingTypeFilter>("all");
export const buildingTypeFilter = {
  get value() {
    return _buildingTypeFilter;
  },
  set(v: BuildingTypeFilter) {
    _buildingTypeFilter = v;
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

export type LandingModalTab = "welcome" | "campus";

interface ModalStoreState {
  open: boolean;
  type: (typeof modalOptions)[number] | null;
  landingTab?: LandingModalTab;
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
    | "event"
    | "events"
    | null;
  value: string;
  // Stable, unique identifier for a selected event. Event titles are not
  // unique, so event lookups should prefer this slug over `value`/`inputValue`.
  eventSlug?: string;
}

type RecentSearch = {
  category: Exclude<QueryStoreState["category"], null>;
  value: string;
  eventSlug?: string;
};

class ModalStore {
  private _modalStore: ModalStoreState = $state({
    open: false,
    type: null,
  });

  open = $derived(this._modalStore.open);
  type = $derived(this._modalStore.type);
  landingTab = $derived(this._modalStore.landingTab);

  openModal = (
    type: ModalStoreState["type"],
    options?: { landingTab?: LandingModalTab },
  ) => {
    this._modalStore.open = true;
    this._modalStore.type = type;
    this._modalStore.landingTab = options?.landingTab;
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
  selectedEventSlug = $derived(this._queryStore.eventSlug ?? null);
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
        eventSlug: obj.eventSlug,
      });
    }
  };

  hydrateQuery = (obj: QueryStoreState) => {
    this._queryStore = obj;
    this.inputValue = obj.value;
  };

  addRecentSearch(recentSearch: RecentSearch) {
    const qIndex = this.recentSearches.findIndex((query) => {
      if (query.category !== recentSearch.category) return false;
      if (
        recentSearch.category === "event" &&
        recentSearch.eventSlug &&
        query.eventSlug
      ) {
        return query.eventSlug === recentSearch.eventSlug;
      }
      return query.value === recentSearch.value;
    });
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

  /** Drop an active result selection while keeping the search field editable. */
  exitResultMode = () => {
    this._queryStore = {
      category: null,
      type: "query",
      value: "",
    };
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

  private isWithinBounds(lng: number, lat: number) {
    return (
      lng >= CAMPUS_BOUNDS.minLng &&
      lng <= CAMPUS_BOUNDS.maxLng &&
      lat >= CAMPUS_BOUNDS.minLat &&
      lat <= CAMPUS_BOUNDS.maxLat
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

class MapViewStore {
  eventsOnly: boolean = $state(false);

  toggleEventsOnly = () => {
    this.eventsOnly = !this.eventsOnly;
  };

  showAll = () => {
    this.eventsOnly = false;
  };
}

class MainControlsStore {
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

export type FloatingControlPanel =
  "legend" | "building-type" | "terrain" | "admin" | "suggest-addition";

class FloatingControlPanelStore {
  openPanel: FloatingControlPanel | null = $state(null);

  toggle = (panel: FloatingControlPanel) => {
    this.openPanel = this.openPanel === panel ? null : panel;
  };

  close = (panel?: FloatingControlPanel) => {
    if (panel === undefined || this.openPanel === panel) {
      this.openPanel = null;
    }
  };
}

export type MapToolsSection = "view" | "legend" | "terrain" | "jeepney";

class MapToolsStore {
  open = $state(false);
  activeSection: MapToolsSection | null = $state("view");
  /** Accordion: view only by default; legend/terrain/transit collapsed. */
  expandedSections = $state<Set<MapToolsSection>>(new Set(["view"]));

  toggle = () => {
    this.open = !this.open;
    if (this.open && this.activeSection === null) {
      this.activeSection = "view";
    }
  };

  close = () => {
    this.open = false;
  };

  openSection = (section: MapToolsSection) => {
    this.activeSection = section;
    this.expandedSections = new Set(this.expandedSections).add(section);
    this.open = true;
  };

  toggleSection = (section: MapToolsSection) => {
    const next = new Set(this.expandedSections);
    if (next.has(section)) {
      next.delete(section);
    } else {
      next.add(section);
    }
    this.expandedSections = next;
    this.activeSection = section;
  };
}

class EditorChromeStore {
  shelfOpen = $state(false);
  additionModalOpen = $state(false);

  openShelf = () => {
    this.shelfOpen = true;
  };

  closeShelf = () => {
    this.shelfOpen = false;
  };

  toggleShelf = () => {
    this.shelfOpen = !this.shelfOpen;
  };

  openAdditionModal = () => {
    this.additionModalOpen = true;
    this.shelfOpen = false;
  };

  closeAdditionModal = () => {
    this.additionModalOpen = false;
  };
}

class MapEditStore {
  enabled: boolean = $state(false);

  enable = () => {
    if (this.enabled) return;
    this.enabled = true;
    deactivateMapModesExcept("edit");
  };

  toggle = () => {
    if (this.enabled) this.enabled = false;
    else this.enable();
  };

  close = () => {
    this.enabled = false;
  };
}

export type MapProposalTarget = {
  type: "building" | "dorm" | "event";
  id: number;
  label: string;
  version: number;
};

class MapProposalStore {
  target: MapProposalTarget | null = $state(null);
  submitterName = $state("");
  proposalId: number | null = $state(null);

  get enabled() {
    return this.target !== null;
  }

  pinKey(): string | null {
    if (!this.target) return null;
    if (this.target.type === "event") return `event:${this.target.id}:location`;
    return `${this.target.type}:${this.target.id}`;
  }

  allowsKey(key: string) {
    return this.enabled && this.pinKey() === key;
  }

  enable(
    target: MapProposalTarget,
    submitterName = "",
    proposalId: number | null = null,
  ) {
    this.target = target;
    this.submitterName = submitterName;
    this.proposalId = proposalId;
  }

  disable() {
    this.target = null;
    this.proposalId = null;
  }
}

class AdditionProposalStore {
  pinPickActive = $state(false);
  draftPin: { lat: number; lon: number } | null = $state(null);
  private pinResolver: ((coords: { lat: number; lon: number }) => void) | null =
    null;
  private pinReject: ((reason?: unknown) => void) | null = null;

  requestMapPin() {
    if (this.pinPickActive) {
      this.cancelMapPin();
    }
    this.pinPickActive = true;
    return new Promise<{ lat: number; lon: number }>((resolve, reject) => {
      this.pinResolver = resolve;
      this.pinReject = reject;
    });
  }

  deliverMapPin(lat: number, lon: number) {
    const coords = { lat, lon };
    this.draftPin = coords;
    this.pinResolver?.(coords);
    this.pinResolver = null;
    this.pinReject = null;
    this.pinPickActive = false;
  }

  cancelMapPin() {
    this.pinReject?.(new Error("cancelled"));
    this.pinResolver = null;
    this.pinReject = null;
    this.pinPickActive = false;
  }

  clearDraftPin() {
    this.draftPin = null;
  }

  setDraftPin(pin: { lat: number; lon: number } | null) {
    this.draftPin = pin;
  }
}

export type EventPlacementDraft = {
  slug: string;
  title: string;
  startsAt: string;
  endsAt: string;
  category: "tradition" | "fair" | "ceremony" | "sports" | "other";
  imageUrl: string | null;
};

class EventPlacementStore {
  draft: EventPlacementDraft | null = $state(null);
  creating: boolean = $state(false);
  createdEventId: number | null = $state(null);
  proposing: boolean = $state(false);
  submitterName: string = $state("");
  active = $derived(this.draft !== null);

  start = (
    draft: EventPlacementDraft,
    options: { propose?: boolean; submitterName?: string } = {},
  ) => {
    this.draft = draft;
    this.creating = false;
    this.createdEventId = null;
    this.proposing = options.propose ?? false;
    this.submitterName = options.submitterName?.trim() ?? "";
    deactivateMapModesExcept("edit");
  };

  beginCreate = () => {
    if (!this.draft) return;
    this.creating = true;
  };

  finishCreate = (eventId: number) => {
    this.draft = null;
    this.creating = false;
    this.createdEventId = eventId;
  };

  failCreate = () => {
    this.creating = false;
  };

  cancel = () => {
    this.draft = null;
    this.creating = false;
    this.proposing = false;
    this.submitterName = "";
    clearProposeEventDraft();
  };

  consumeCreatedEvent = (eventId: number) => {
    if (this.createdEventId !== eventId) return false;
    this.createdEventId = null;
    return true;
  };
}

type TerrainStatus = "idle" | "loading" | "active" | "unavailable";

class TerrainStore {
  enabled: boolean = $state(false);
  menuOpen: boolean = $state(false);
  exaggeration: number = $state(DEFAULT_TERRAIN_EXAGGERATION);
  status: TerrainStatus = $state("idle");
  message: string | null = $state(null);
  resetNonce: number = $state(0);

  toggleMenu = () => {
    this.menuOpen = !this.menuOpen;
  };

  closeMenu = () => {
    this.menuOpen = false;
  };

  enable = () => {
    this.enabled = true;
    this.status = "loading";
    this.message = null;
    deactivateMapModesExcept("terrain");
  };

  disable = () => {
    this.enabled = false;
    this.status = "idle";
    this.message = null;
  };

  toggle = () => {
    if (this.enabled) this.disable();
    else this.enable();
  };

  setExaggeration = (value: number) => {
    this.exaggeration = value;
  };

  markLoading = () => {
    if (!this.enabled) return;
    this.status = "loading";
    this.message = null;
  };

  markActive = () => {
    if (!this.enabled) return;
    this.status = "active";
    this.message = null;
  };

  markUnavailable = (message: string) => {
    this.enabled = false;
    this.status = "unavailable";
    this.message = message;
  };

  requestReset = () => {
    this.resetNonce += 1;
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

class ProposalsStore {
  pendingCount = $state(0);
  open = $state(false);
  loading = $state(false);
  proposals = $state<
    Array<{
      id: number;
      entityType: string;
      entityId: number;
      entityLabel: string;
      status: string;
      submitterName: string;
      proposedPatch: Record<string, unknown>;
      adminNote?: string | null;
      createdAt: string;
    }>
  >([]);

  refresh = async () => {
    if (!adminAuthStore.canReview) {
      this.pendingCount = 0;
      this.proposals = [];
      return;
    }
    this.loading = true;
    try {
      const res = await fetch("/api/admin/proposals", {
        credentials: "same-origin",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        pendingCount?: number;
        proposals?: ProposalsStore["proposals"];
      };
      this.pendingCount = data.pendingCount ?? 0;
      this.proposals = data.proposals ?? [];
    } catch {
      // ignore
    } finally {
      this.loading = false;
    }
  };

  toggle = () => {
    this.open = !this.open;
    if (this.open) void this.refresh();
  };

  close = () => {
    this.open = false;
  };
}

class AdminAuthStore {
  isLoggedIn: boolean = $state(false);
  username: string | null = $state(null);
  displayName: string | null = $state(null);
  role: "admin" | "editor" | "contributor" | null = $state(null);
  canPublish: boolean = $state(false);
  canReview: boolean = $state(false);
  loading: boolean = $state(false);
  loginOpen: boolean = $state(false);
  private _hydrated = false;

  private applySession(data: {
    loggedIn?: boolean;
    admin?: boolean;
    username: string | null;
    displayName?: string | null;
    role?: "admin" | "editor" | "contributor" | null;
    canPublish?: boolean;
    canReview?: boolean;
  }) {
    this.isLoggedIn = data.loggedIn ?? data.admin ?? false;
    this.username = data.username;
    this.displayName = data.displayName ?? data.username;
    this.role = data.role ?? null;
    this.canPublish = data.canPublish ?? false;
    this.canReview = data.canReview ?? false;
    if (data.canReview) void proposalsStore.refresh();
  }

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
        loggedIn?: boolean;
        admin?: boolean;
        username: string | null;
        displayName?: string | null;
        role?: "admin" | "editor" | "contributor" | null;
        canPublish?: boolean;
        canReview?: boolean;
      };
      this.applySession(data);
    } catch {
      this.isLoggedIn = false;
      this.username = null;
      this.displayName = null;
      this.role = null;
      this.canPublish = false;
      this.canReview = false;
    }
  };

  login = async (
    username: string,
    password: string,
  ): Promise<string | null> => {
    this.loading = true;
    try {
      const formData = new FormData();
      formData.set("username", username.trim());
      formData.set("password", password);

      const res = await fetch("/api/admin/auth", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });
      const data = await res.json().catch(
        () =>
          ({}) as {
            error?: string;
            username?: string;
            displayName?: string;
            role?: "admin" | "editor" | "contributor";
            canPublish?: boolean;
            canReview?: boolean;
          },
      );
      if (!res.ok) {
        return data.error ?? `Login failed (${res.status})`;
      }
      this.applySession({
        loggedIn: true,
        username: data.username ?? username.trim().toLowerCase(),
        displayName: data.displayName,
        role: data.role ?? "editor",
        canPublish: data.canPublish,
        canReview: data.canReview,
      });
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
    this.isLoggedIn = false;
    this.username = null;
    this.displayName = null;
    this.role = null;
    this.canPublish = false;
    this.canReview = false;
    proposalsStore.pendingCount = 0;
    proposalsStore.proposals = [];
  };

  openLogin = () => {
    this.loginOpen = true;
  };

  closeLogin = () => {
    this.loginOpen = false;
  };
}

class JeepneyStore {
  /** Transit/jeepney layer visible (search chip or map tools). */
  layerActive: boolean = $state(false);
  selectedRouteId: string | null = $state(null);
  menuOpen: boolean = $state(false);
  selectedStopIndex: number | null = $state(null);
  hoveredStopIndex: number | null = $state(null);

  toggleMenu = () => {
    this.menuOpen = !this.menuOpen;
  };

  closeMenu = () => {
    this.menuOpen = false;
  };

  toggleLayer = () => {
    if (this.layerActive) {
      this.layerActive = false;
      this.menuOpen = false;
      return;
    }
    this.enableLayer();
  };

  enableLayer = () => {
    this.layerActive = true;
    mapToolsStore.close();
    deactivateMapModesExcept("routes");
    // Transit is mutually exclusive with building/dorm pin filters: reset to
    // All so filtered pins don't overlap jeepney routes/stops (#325). This
    // covers every enable path (search chip, map tools flyout, route picker).
    buildingTypeFilter.set("all");
  };

  disableLayer = () => {
    this.layerActive = false;
    this.selectedRouteId = null;
    this.menuOpen = false;
    this.closeStop();
  };

  selectRoute = (id: string) => {
    if (!this.layerActive) {
      this.enableLayer();
    }
    const nextId = this.selectedRouteId === id ? null : id;
    if (nextId !== this.selectedRouteId) {
      this.closeStop();
    }
    this.selectedRouteId = nextId;
    this.menuOpen = false;
    if (this.selectedRouteId !== null) {
      deactivateMapModesExcept("routes");
    }
  };

  clearRoute = () => {
    this.selectedRouteId = null;
    this.closeStop();
  };

  setHoveredStop = (index: number | null) => {
    this.hoveredStopIndex = index;
  };

  openStop = (index: number) => {
    if (this.selectedRouteId === null) return;
    this.selectedStopIndex = index;
    this.hoveredStopIndex = index;
    sidePanelStore.expand();
  };

  closeStop = () => {
    this.selectedStopIndex = null;
    this.hoveredStopIndex = null;
  };
}

export type AppBootstrapPhase =
  "idle" | "local" | "remote" | "sync" | "ready" | "error";

class AppBootstrapStore {
  phase = $state<AppBootstrapPhase>("idle");
  errorMessage = $state<string | null>(null);
  hasCachedData = $state(false);
  private retryHandler: (() => void) | null = null;

  /** Bootstrap never blocks the map; static HTML shell only until hydration. */
  showBlockingOverlay = $derived(false);

  statusLabel = $derived.by(() => {
    switch (this.phase) {
      case "remote":
        return "Connecting to database";
      case "sync":
        return "Writing to offline cache";
      case "error":
        return this.errorMessage ?? "Could not load campus data";
      default:
        return null;
    }
  });

  beginRemote() {
    this.phase = "remote";
    this.errorMessage = null;
  }

  beginSync() {
    this.phase = "sync";
    this.errorMessage = null;
  }

  complete() {
    this.phase = "ready";
    this.errorMessage = null;
  }

  markBackgroundRefresh() {
    if (
      this.phase === "idle" ||
      this.phase === "ready" ||
      this.phase === "error"
    ) {
      this.phase = "remote";
      this.errorMessage = null;
    }
  }

  setHasCachedData(value: boolean) {
    this.hasCachedData = value;
  }

  setRetryHandler(handler: () => void) {
    this.retryHandler = handler;
  }

  get canRetry() {
    return this.retryHandler !== null;
  }

  fail(message: string, retry?: () => void) {
    this.phase = "error";
    this.errorMessage = message;
    if (retry) {
      this.retryHandler = retry;
    }
  }

  retry() {
    const handler = this.retryHandler;
    if (!handler) return;
    this.errorMessage = null;
    this.beginRemote();
    handler();
  }
}

class SyncToastStore {
  activity = $state<SyncActivity>("idle");
  activityTable = $state<SyncTableKey | null>(null);
  fetchProgress = $state<{ done: number; total: number } | null>(null);
  syncError = $state<string | null>(null);

  private _buildings = $state<SyncInfo | null>(null);
  private _colleges = $state<SyncInfo | null>(null);
  private _divisions = $state<SyncInfo | null>(null);
  private _dorms = $state<SyncInfo | null>(null);
  private _events = $state<SyncInfo | null>(null);
  private _aliases = $state<SyncInfo | null>(null);

  currentSync = $state<SyncTableKey | null>(null);
  allSynced = $state<boolean>(false);
  recentlySynced = $state<boolean | null>(null);
  fetchingRemote = $state<boolean>(false);

  currentSyncData = $derived.by((): SyncInfo | null => {
    switch (this.currentSync) {
      case "buildings":
        return this._buildings;
      case "colleges":
        return this._colleges;
      case "divisions":
        return this._divisions;
      case "dorms":
        return this._dorms;
      case "events":
        return this._events;
      case "aliases":
        return this._aliases;
      default:
        return null;
    }
  });

  isSyncing = $derived(
    !this.allSynced &&
      this.syncError === null &&
      (this.activity !== "idle" || this.fetchingRemote),
  );

  hasCountableProgress = $derived.by(() => {
    const data = this.currentSyncData;
    if (data !== null && data.total > 0) return true;
    const fetch = this.fetchProgress;
    return fetch !== null && fetch.total > 0;
  });

  progressPercent = $derived.by(() => {
    const data = this.currentSyncData;
    if (data !== null && data.total > 0) {
      return Math.min(100, Math.round((data.synced / data.total) * 100));
    }
    const fetch = this.fetchProgress;
    if (fetch !== null && fetch.total > 0) {
      return Math.min(100, Math.round((fetch.done / fetch.total) * 100));
    }
    return 0;
  });

  stepLabel = $derived.by(() => {
    if (this.syncError) return this.syncError;
    if (this.allSynced && !this.needRefresh) return "Up to date";
    if (this.needRefresh) return "Update ready";
    if (this.activity === "checking") return "Connecting to database…";
    if (this.activity === "fetching") {
      if (this.activityTable !== null) {
        return `Fetching ${syncTableLabel(this.activityTable)}…`;
      }
      const fetch = this.fetchProgress;
      if (fetch !== null && fetch.total > 0) {
        return `Fetching campus data (${fetch.done}/${fetch.total})…`;
      }
      return "Fetching campus data…";
    }
    if (this.activity === "writing" && this.currentSync !== null) {
      const label = syncTableLabel(this.currentSync);
      const data = this.currentSyncData;
      if (data !== null && data.total > 0) {
        return `Syncing ${label} (${data.synced}/${data.total})`;
      }
      return `Writing ${label} to offline cache…`;
    }
    if (this.fetchingRemote) return "Connecting to database…";
    return "Syncing…";
  });

  stepDetail = $derived.by((): string | null => {
    if (this.syncError) return "Tap to retry";
    if (this.allSynced && !this.needRefresh) {
      return "Campus directory cached; room lists load when you open a building";
    }
    if (this.needRefresh) return "Reload to get the latest updates.";
    if (this.activity === "checking") {
      return "Checking if local data is current";
    }
    if (this.activity === "fetching") {
      return "Loading latest from server";
    }
    if (this.activity === "writing") {
      return "Saving to device for offline use";
    }
    return null;
  });

  // Service worker "new content available" update, surfaced inside this same
  // bottom offline toast instead of a separate floating prompt.
  public needRefresh = $state<boolean>(false);
  private _refresh: (() => void) | null = null;
  private _syncRetry: (() => void) | null = null;

  setRefreshHandler(fn: () => void) {
    this._refresh = fn;
  }
  markNeedRefresh() {
    this.needRefresh = true;
  }
  dismissRefresh() {
    this.needRefresh = false;
  }
  reload() {
    this._refresh?.();
  }

  get canRetrySync() {
    return this._syncRetry !== null;
  }

  setSyncError(message: string, retry?: () => void) {
    this.syncError = message;
    this._syncRetry = retry ?? null;
    this.activity = "idle";
    this.activityTable = null;
    this.fetchProgress = null;
    this.fetchingRemote = false;
    this.currentSync = null;
    this.allSynced = false;
  }

  clearSyncError() {
    this.syncError = null;
    this._syncRetry = null;
  }

  retrySync() {
    const handler = this._syncRetry;
    if (!handler) return;
    this.clearSyncError();
    this.allSynced = false;
    this.recentlySynced = true;
    handler();
  }

  startRemoteFetch() {
    this.clearSyncError();
    this.activity = "checking";
    this.activityTable = null;
    this.fetchProgress = null;
    this.fetchingRemote = true;
    this.allSynced = false;
    this.recentlySynced = true;
    this.currentSync = null;
    this._buildings = null;
    this._colleges = null;
    this._divisions = null;
    this._dorms = null;
    this._events = null;
    this._aliases = null;
  }

  beginFetchingCampus(totalFetches: number) {
    this.activity = "fetching";
    this.activityTable = null;
    this.fetchProgress = { done: 0, total: totalFetches };
    this.fetchingRemote = true;
  }

  reportFetchComplete() {
    if (this.fetchProgress === null) return;
    this.fetchProgress = {
      done: Math.min(this.fetchProgress.done + 1, this.fetchProgress.total),
      total: this.fetchProgress.total,
    };
  }

  markWritingPhase(table: SyncTableKey) {
    this.activity = "writing";
    this.activityTable = table;
    this.fetchingRemote = false;
    this.fetchProgress = null;
    this.currentSync = table;
  }

  private beginWriting(table: SyncTableKey, total: number) {
    this.markWritingPhase(table);
    const info: SyncInfo = { synced: 0, total };
    switch (table) {
      case "buildings":
        this._buildings = info;
        break;
      case "colleges":
        this._colleges = info;
        break;
      case "divisions":
        this._divisions = info;
        break;
      case "dorms":
        this._dorms = info;
        break;
      case "events":
        this._events = info;
        break;
      case "aliases":
        this._aliases = info;
        break;
    }
    this.recentlySynced = true;
  }

  startBuildingsSync(total: number) {
    this.beginWriting("buildings", total);
  }
  startCollegesSync(total: number) {
    this.beginWriting("colleges", total);
  }
  startDivisionsSync(total: number) {
    this.beginWriting("divisions", total);
  }
  startDormsSync(total: number) {
    this.beginWriting("dorms", total);
  }
  startEventsSync(total: number) {
    this.beginWriting("events", total);
  }
  startAliasesSync(total: number) {
    this.beginWriting("aliases", total);
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
  updateEventsSync() {
    if (this._events === null) return;
    this._events.synced++;
  }
  updateAliasesSync() {
    if (this._aliases === null) return;
    this._aliases.synced++;
  }

  endSync(didSync = true) {
    if (this.syncError !== null) return;
    this.activity = "idle";
    this.activityTable = null;
    this.fetchProgress = null;
    this.fetchingRemote = false;
    this.currentSync = null;
    this.allSynced = true;
    if (this.recentlySynced === null) {
      this.recentlySynced = didSync;
    } else if (!didSync) {
      this.recentlySynced = false;
    }
  }
}

type OfflineStatus = "idle" | "downloading" | "done" | "error" | "cancelled";

class OfflineStore {
  status = $state<OfflineStatus>("idle");
  tilesTotal = $state(0);
  tilesDone = $state(0);
  bytesDownloaded = $state(0);
  storageUsed = $state<number | null>(null);
  error = $state<string | null>(null);
  private cancelRequested = false;

  progress = $derived(
    this.tilesTotal === 0 ? 0 : Math.min(1, this.tilesDone / this.tilesTotal),
  );
  estimatedBytes = $derived(this.tilesTotal * AVG_TILE_BYTES);

  // Compute the tile count up front so the size estimate shows before download.
  prepareEstimate = async () => {
    void this.refreshStorage();
    if (this.tilesTotal !== 0) return;
    const source = await getTileTemplate();
    this.tilesTotal = getCampusTileCoords(MIN_ZOOM, source?.maxZoom).length;
  };

  refreshStorage = async () => {
    this.storageUsed = await getStorageUsage();
  };

  cancel = () => {
    this.cancelRequested = true;
  };

  downloadCampus = async () => {
    if (this.status === "downloading") return;
    this.cancelRequested = false;
    this.error = null;
    this.tilesDone = 0;
    this.bytesDownloaded = 0;
    this.status = "downloading";

    const source = await getTileTemplate();
    if (!source) {
      this.status = "error";
      this.error = "Could not resolve the map tile source.";
      return;
    }

    const coords = getCampusTileCoords(MIN_ZOOM, source.maxZoom);
    this.tilesTotal = coords.length;

    let index = 0;
    const worker = async () => {
      while (index < coords.length && !this.cancelRequested) {
        const coord = coords[index++];
        if (!coord) break;
        try {
          const res = await fetch(tileUrl(source.template, coord), {
            mode: "cors",
          });
          if (res.ok) {
            const len = Number(res.headers.get("content-length"));
            if (Number.isFinite(len) && len > 0) {
              this.bytesDownloaded += len;
            } else {
              const buf = await res.clone().arrayBuffer();
              this.bytesDownloaded += buf.byteLength;
            }
          }
        } catch {
          // Skip individual tile failures; keep the overall download going.
        }
        this.tilesDone++;
      }
    };

    try {
      // Modest concurrency to fill the cache quickly without hammering the API.
      await Promise.all(Array.from({ length: 6 }, () => worker()));
      await this.refreshStorage();
      this.status = this.cancelRequested ? "cancelled" : "done";
    } catch (e) {
      console.error("Offline map download failed:", e);
      this.status = "error";
      this.error = "Download failed. Check your connection and try again.";
    }
  };

  clear = async () => {
    await clearMapCaches();
    this.tilesDone = 0;
    this.bytesDownloaded = 0;
    this.status = "idle";
    await this.refreshStorage();
  };
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

/**
 * Classes for the currently viewed room, scoped to the active term. Results are
 * cached per `${roomCode}::${termId}` key so switching back and forth between
 * terms/rooms doesn't refetch.
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
export const offlineStore = new OfflineStore();
export const modalStore = new ModalStore();
export const toastStore = new ToastStore();
export const locationStore = new LocationStore();
export const mapStore = new MapStore();
export const mapViewStore = new MapViewStore();
export const sidePanelStore = new MainControlsStore();
export const floatingControlPanelStore = new FloatingControlPanelStore();
export const mapToolsStore = new MapToolsStore();
export const editorChromeStore = new EditorChromeStore();
export const mapEditStore = new MapEditStore();
export const mapProposalStore = new MapProposalStore();
export const additionProposalStore = new AdditionProposalStore();
export const eventPlacementStore = new EventPlacementStore();
export const terrainStore = new TerrainStore();
export const jeepneyStore = new JeepneyStore();
export const appBootstrapStore = new AppBootstrapStore();
export const syncToastStore = new SyncToastStore();
export const building3DStore = new Building3DStore();
export const adminAuthStore = new AdminAuthStore();
export const proposalsStore = new ProposalsStore();

// Map modes (edit, jeepney routes, Makiling terrain) are mutually exclusive:
// they take over the camera, pins, and map interactions. Location/propose
// actions live in the bottom chrome tray. Activating one mode tears the others
// down via deactivateMapModesExcept().
export type ExclusiveMapMode = "edit" | "routes" | "terrain";

export function deactivateMapModesExcept(active: ExclusiveMapMode) {
  if (active !== "edit") {
    mapEditStore.close();
    eventPlacementStore.cancel();
  }
  if (active !== "routes") {
    jeepneyStore.disableLayer();
  }
  if (active !== "terrain") {
    terrainStore.disable();
  }
}
