import * as maplibre from "maplibre-gl";
import { DEFAULT_TERRAIN_EXAGGERATION } from "@constants/map-terrain";
import { dismissEphemeralOverlays } from "../overlay-stack.js";
import { deactivateMapModesExcept } from "./map-modes.js";
import type { MapToolsSection, TerrainStatus } from "./store-types.js";

export class MapStore {
  mapInstance: maplibre.MapLibreMap | undefined = $state.raw();
}

export class MapViewStore {
  eventsOnly: boolean = $state(false);

  toggleEventsOnly = () => {
    this.eventsOnly = !this.eventsOnly;
  };

  showAll = () => {
    this.eventsOnly = false;
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

export class Building3DStore {
  buildingName: string | null = $state(null);

  open = (name: string) => {
    dismissEphemeralOverlays();
    this.buildingName = name;
  };

  close = () => {
    this.buildingName = null;
  };
}
