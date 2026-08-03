import type * as maplibre from "maplibre-gl";
import {
  DEFAULT_TERRAIN_EXAGGERATION,
  TERRAIN_ENABLED,
} from "@constants/map-terrain";
import { dismissEphemeralOverlays } from "../overlay-stack.js";
import { deactivateMapModesExcept } from "./map-modes.js";
import type { MapToolsSection, TerrainStatus } from "./store-types.js";

export class MapStore {
  mapInstance: maplibre.MapLibreMap | undefined = $state.raw();
}

export class MapViewStore {
  eventsOnly: boolean = $state(false);
  // Org/office and place (POI) pin layers — on by default, toggled from the
  // map legend so users can declutter the map (#18b).
  showOrgs: boolean = $state(true);
  showPlaces: boolean = $state(true);
  // Emphasize buildings hosting the user's planner classes; dim other pins.
  highlightMyBuildings: boolean = $state(false);
  /** Org/place pins are also zoom-gated in Map.svelte. The legend reads this
   * so its toggles cannot claim "Shown" while the gate is hiding them. */
  poiPinsZoomVisible: boolean = $state(true);

  toggleEventsOnly = () => {
    this.eventsOnly = !this.eventsOnly;
  };

  toggleOrgs = () => {
    this.showOrgs = !this.showOrgs;
  };

  togglePlaces = () => {
    this.showPlaces = !this.showPlaces;
  };

  toggleHighlightMyBuildings = () => {
    this.highlightMyBuildings = !this.highlightMyBuildings;
    // Events-only hides building pins entirely — pointless combined with a
    // building highlight, so leave that mode when highlighting.
    if (this.highlightMyBuildings) this.eventsOnly = false;
  };

  showAll = () => {
    this.eventsOnly = false;
    this.showOrgs = true;
    this.showPlaces = true;
    this.highlightMyBuildings = false;
  };
}

export class MapToolsStore {
  open = $state(false);
  activeSection: MapToolsSection | null = $state("view");
  expandedSections = $state<Set<MapToolsSection>>(new Set(["view"]));

  toggle = () => {
    const next = !this.open;
    if (next) dismissEphemeralOverlays();
    this.open = next;
    if (this.open && this.activeSection === null) {
      this.activeSection = "view";
    }
  };

  close = () => {
    this.open = false;
  };

  openSection = (section: MapToolsSection) => {
    dismissEphemeralOverlays();
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

export class TerrainStore {
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
    // Single gate for every enable path (toggle, controls, restored state):
    // campuses without terrain data (campusTerrain.enabled = false) stay flat.
    if (!TERRAIN_ENABLED) return;
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

export class TrailStore {
  enabled: boolean = $state(false);

  toggle = () => {
    this.enabled = !this.enabled;
  };

  enable = () => {
    this.enabled = true;
  };

  disable = () => {
    this.enabled = false;
  };
}

/**
 * Travel-time isochrone tool (#847): tap the map, every path segment colors
 * by walking minutes from that point. Owns map clicks, so it registers as an
 * exclusive map mode. Engine work happens in Map.svelte; this holds UI state.
 */
export class TravelTimeStore {
  active: boolean = $state(false);
  origin: { lat: number; lng: number } | null = $state(null);
  status: "idle" | "loading" | "ready" | "error" = $state("idle");

  enable = () => {
    this.active = true;
    deactivateMapModesExcept("travel-time");
    dismissEphemeralOverlays();
  };

  disable = () => {
    this.active = false;
    this.origin = null;
    this.status = "idle";
  };

  toggle = () => {
    if (this.active) this.disable();
    else this.enable();
  };

  setOrigin = (lat: number, lng: number) => {
    this.origin = { lat, lng };
  };
}

export class Building3DStore {
  buildingName: string | null = $state(null);
  initialRoomCode: string | null = $state(null);
  initialEditMode: boolean = $state(false);

  open = (
    name: string,
    options?: { roomCode?: string; editMode?: boolean },
  ) => {
    dismissEphemeralOverlays();
    this.buildingName = name;
    this.initialRoomCode = options?.roomCode ?? null;
    this.initialEditMode = options?.editMode ?? false;
  };

  close = () => {
    this.buildingName = null;
    this.initialRoomCode = null;
    this.initialEditMode = false;
  };
}
