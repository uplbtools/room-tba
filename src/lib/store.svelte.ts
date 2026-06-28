// src/lib/store.svelte.ts

import { modalOptions } from "@constants/modal-states";
import {
  DEFAULT_TERRAIN_EXAGGERATION,
  CAMPUS_BOUNDS,
} from "@constants/map-terrain";
import { SvelteMap } from "svelte/reactivity";
import * as maplibre from "maplibre-gl";
import { getJSONFetch, getLocalRoomByCode } from "./local/data/utils";
import {
  AVG_TILE_BYTES,
  clearMapCaches,
  getCampusTileCoords,
  getStorageUsage,
  getTileTemplate,
  MIN_ZOOM,
  tileUrl,
} from "./local/offline-maps";
import type { BuildingTypeFilter } from "../constants/building-types";

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
  | "legend"
  | "building-type"
  | "terrain"
  | "jeepney"
  | "admin"
  | "suggest-addition";

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

export type MapToolsSection =
  "view" | "legend" | "building-type" | "terrain" | "jeepney";

class MapToolsStore {
  open = $state(false);
  activeSection: MapToolsSection | null = $state("view");
  /** Accordion: terrain and jeepney collapsed by default. */
  expandedSections = $state<Set<MapToolsSection>>(new Set(["view", "legend"]));

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
}

export type EventPlacementDraft = {
  slug: string;
  title: string;
  startsAt: string;
  endsAt: string;
  category: "tradition" | "fair" | "ceremony" | "sports" | "other";
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
    // Selecting (not clearing) a route activates routes mode.
    if (this.selectedRouteId !== null) deactivateMapModesExcept("routes");
  };

  clearRoute = () => {
    this.selectedRouteId = null;
  };
}

export type AppBootstrapPhase =
  "idle" | "local" | "remote" | "sync" | "ready" | "error";

const APP_BOOTSTRAP_DEADLINE_MS = 90_000;

class AppBootstrapStore {
  phase = $state<AppBootstrapPhase>("idle");
  errorMessage = $state<string | null>(null);
  hasCachedData = $state(false);
  private retryHandler: (() => void) | null = null;
  private bootstrapDeadline: ReturnType<typeof setTimeout> | null = null;

  showBlockingOverlay = $derived(
    this.phase === "local" ||
      (this.phase === "remote" && !this.hasCachedData) ||
      (this.phase === "error" && !this.hasCachedData),
  );

  get isBlockingPhase() {
    return this.showBlockingOverlay;
  }

  statusLabel = $derived.by(() => {
    switch (this.phase) {
      case "local":
        return "Loading campus data";
      case "remote":
        return "Connecting to database";
      case "error":
        return this.errorMessage ?? "Could not load campus data";
      default:
        return null;
    }
  });

  beginLocal() {
    this.clearBootstrapDeadline();
    this.errorMessage = null;
    this.phase = "local";
    this.scheduleBootstrapDeadline();
  }

  beginRemote() {
    this.phase = "remote";
    this.errorMessage = null;
    if (this.bootstrapDeadline === null) {
      this.scheduleBootstrapDeadline();
    }
  }

  beginSync() {
    this.phase = "sync";
    this.errorMessage = null;
  }

  complete() {
    this.clearBootstrapDeadline();
    this.phase = "ready";
    this.errorMessage = null;
    this.retryHandler = null;
  }

  markBackgroundRefresh() {
    if (this.phase === "idle" || this.phase === "ready") {
      this.phase = "remote";
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
    this.clearBootstrapDeadline();
    this.phase = "error";
    this.errorMessage = message;
    this.retryHandler = retry ?? null;
  }

  retry() {
    const handler = this.retryHandler;
    if (!handler) return;
    this.errorMessage = null;
    this.clearBootstrapDeadline();
    this.scheduleBootstrapDeadline();
    this.beginRemote();
    handler();
  }

  /** Escape hatch when bootstrap finishes without reaching ready/error. */
  forceResolveBlockingPhase() {
    if (this.phase === "ready" || this.phase === "idle") return;
    if (this.hasCachedData || this.phase === "sync") {
      this.complete();
      return;
    }
    this.fail(
      "This is taking longer than expected. Check your connection.",
      this.retryHandler ?? undefined,
    );
  }

  private scheduleBootstrapDeadline() {
    this.clearBootstrapDeadline();
    this.bootstrapDeadline = setTimeout(() => {
      if (this.phase === "ready" || this.phase === "idle") return;
      if (this.hasCachedData || this.phase === "sync") {
        this.complete();
        return;
      }
      this.fail(
        "This is taking longer than expected. Check your connection.",
        this.retryHandler ?? undefined,
      );
    }, APP_BOOTSTRAP_DEADLINE_MS);
  }

  private clearBootstrapDeadline() {
    if (this.bootstrapDeadline !== null) {
      clearTimeout(this.bootstrapDeadline);
      this.bootstrapDeadline = null;
    }
  }
}

class SyncToastStore {
  private _buildings = $state<SyncInfo | null>(null);
  private _colleges = $state<SyncInfo | null>(null);
  private _divisions = $state<SyncInfo | null>(null);
  private _dorms = $state<SyncInfo | null>(null);
  private _events = $state<SyncInfo | null>(null);
  public currentSyncData: SyncInfo | null = null;
  public currentSync = $state<string | null>(null);
  public allSynced = $state<boolean>(false);
  public recentlySynced = $state<boolean | null>(null);
  public fetchingRemote = $state<boolean>(false);

  // Service worker "new content available" update, surfaced inside this same
  // bottom offline toast instead of a separate floating prompt.
  public needRefresh = $state<boolean>(false);
  private _refresh: (() => void) | null = null;

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

  startRemoteFetch() {
    this.fetchingRemote = true;
    this.allSynced = false;
    this.recentlySynced = true;
    this.currentSync = null;
    this.currentSyncData = null;
  }

  startBuildingsSync(total: number) {
    this.fetchingRemote = false;
    this._buildings = {
      synced: 0,
      total,
    };
    this.currentSyncData = this._buildings;
    this.currentSync = "buildings";
    this.recentlySynced = true;
  }
  startCollegesSync(total: number) {
    this._colleges = {
      synced: 0,
      total,
    };
    this.currentSyncData = this._colleges;
    this.currentSync = "colleges";
    this.recentlySynced = true;
  }
  startDivisionsSync(total: number) {
    this._divisions = {
      synced: 0,
      total,
    };
    this.currentSyncData = this._divisions;
    this.currentSync = "divisions";
    this.recentlySynced = true;
  }
  startDormsSync(total: number) {
    this._dorms = {
      synced: 0,
      total,
    };
    this.currentSyncData = this._dorms;
    this.currentSync = "dorms";
    this.recentlySynced = true;
  }
  startEventsSync(total: number) {
    this._events = {
      synced: 0,
      total,
    };
    this.currentSyncData = this._events;
    this.currentSync = "events";
    this.recentlySynced = true;
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

  endSync(didSync = true) {
    this.fetchingRemote = false;
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

export const queryStore = new QueryStore();
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

// The bottom-right control cluster exposes three mutually exclusive map modes:
// the editor, jeepney routes, and Makiling terrain. They each take over the
// camera, pins, and map interactions, so only one may be active at a time.
// "None active" stays valid. Activating one tears the others down via their
// own existing disable/clear paths so per-mode side effects unwind cleanly.
export type ExclusiveMapMode = "edit" | "routes" | "terrain";

export function deactivateMapModesExcept(active: ExclusiveMapMode) {
  if (active !== "edit") {
    mapEditStore.close();
    eventPlacementStore.cancel();
  }
  if (active !== "routes") {
    jeepneyStore.clearRoute();
  }
  if (active !== "terrain") {
    terrainStore.disable();
  }
}
