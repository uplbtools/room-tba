import type * as maplibre from 'maplibre-gl';
import { DEFAULT_TERRAIN_EXAGGERATION, TERRAIN_ENABLED } from '$lib/constants/map/terrain.js';
import { dismissEphemeralOverlays } from '../../utils/overlay-stack.js';
import { deactivateMapModesExcept } from './map-modes.js';
import type { MapToolsSection, TerrainStatus } from '../store-types.js';
import { calculatePadding } from '$lib/utils/map/navigate.js';
// import { isMap2DPitch, THREE_D_PITCH } from '$lib/constants/map/dimension.js';
// import { enterFlatMapDimension, enterTiltedMapDimension } from '$lib/utils/map/map-dimension-layers.js';
// import { terrainStore } from '$lib/stores.svelte.js';

type MarkerFilter = "events" | "buildings" | "orgs" | "places" | "all";


type FlyToParams = Parameters<Exclude<maplibre.MapLibreMap["flyTo"], "undefined">>
type FlyToOptions = FlyToParams[0];


export class MapStore {
	private mapInstance: maplibre.MapLibreMap | undefined = $state.raw();
	// Emphasize buildings hosting the user's planner classes; dim other pins.
	// highlightMyBuildings: boolean = $state(false);
	/** Org/place pins are also zoom-gated in Map.svelte. The legend reads this
	 * so its toggles cannot claim "Shown" while the gate is hiding them. */
	poiPinsZoomVisible: boolean = $state(true);
	zoomLevel: number = $state(0);
	// private viewFilter = $state<MarkerFilter>("all");

	public getRawInstance = () => this.mapInstance;
	public setRawInstance = (v : maplibre.MapLibreMap | undefined) => this.mapInstance = v;

	public setZoomLevel(zoomLevel: number) {
		this.zoomLevel = zoomLevel;
	}


	public flyTo(...flyToParams: FlyToParams) {
		if (!this.mapInstance) return;
		this.mapInstance.flyTo(...flyToParams)
	}

	public centerMarker(center: FlyToOptions["center"]) {
		if (!this.mapInstance) return;
		this.mapInstance.flyTo({
			center,
			duration:1000
			// padding: calculatePadding(true),
		})
	}

	public isMapReady(): boolean {
		return typeof this.mapInstance !== "undefined";
	}
	
	public isPoiPinsZoomVisible() {
		return this.poiPinsZoomVisible;
	}

	public toggleDimension() {
		if (!this.mapInstance) return;
		// if (isMap2DPitch(this.mapInstance.getPitch())) {
		// 	this.mapInstance.easeTo({ pitch: THREE_D_PITCH, duration: 400 });
		// 	this.mapInstance.once('moveend', () => enterTiltedMapDimension(this.mapInstance as maplibre.Map, terrainStore.enabled));
		// 	return;
		// }
		// enterFlatMapDimension(this.mapInstance, terrainStore.enabled);
		// Pitch only: dropping to 2D used to also snap the bearing to north, which
		// threw away a rotation the user set on purpose. The compass button is the
		// control that resets north.
		this.mapInstance.easeTo({ pitch: 0, duration: 400 });
	}

	public resetNorth() {
		if (!this.mapInstance) return;
		this.mapInstance.easeTo({ bearing: 0, duration: 400 });
	}

	withinZoom(zoomLevel: number):boolean {
		return zoomLevel <= this.zoomLevel;
	}
}

export class MapToolsStore {
	open = $state(false);
	activeSection: MapToolsSection | null = $state('view');
	expandedSections = $state<Set<MapToolsSection>>(new Set(['view']));

	toggle = () => {
		const next = !this.open;
		if (next) dismissEphemeralOverlays();
		this.open = next;
		if (this.open && this.activeSection === null) {
			this.activeSection = 'view';
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
	status: TerrainStatus = $state('idle');
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
		this.status = 'loading';
		this.message = null;
		deactivateMapModesExcept('terrain');
	};

	disable = () => {
		this.enabled = false;
		this.status = 'idle';
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
		this.status = 'loading';
		this.message = null;
	};

	markActive = () => {
		if (!this.enabled) return;
		this.status = 'active';
		this.message = null;
	};

	markUnavailable = (message: string) => {
		this.enabled = false;
		this.status = 'unavailable';
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
	status: 'idle' | 'loading' | 'ready' | 'error' = $state('idle');

	enable = () => {
		this.active = true;
		deactivateMapModesExcept('travel-time');
		dismissEphemeralOverlays();
	};

	disable = () => {
		this.active = false;
		this.origin = null;
		this.status = 'idle';
	};

	toggle = () => {
		if (this.active) this.disable();
		else this.enable();
	};

	setOrigin = (lat: number, lng: number) => {
		this.origin = { lat, lng };
	};
}

export type MeasureLeg = { seconds: number; meters: number } | null;
export type MeasureSummaries = {
	walk: MeasureLeg[];
	cycle: MeasureLeg[];
	drive: MeasureLeg[];
};

const emptySummaries = (): MeasureSummaries => ({
	walk: [],
	cycle: [],
	drive: []
});

/**
 * Measure-route tool (#848): tap to drop waypoints, legs snap to shortest
 * paths on the walk graph, and the bottom card shows walk/cycle/drive times.
 * Engine work happens in Map.svelte; this holds waypoints + computed legs.
 */
export class MeasureRouteStore {
	active: boolean = $state(false);
	waypoints: { lat: number; lng: number }[] = $state([]);
	/** Waypoints snapped to graph nodes (same order), set after computing. */
	snapped: { lat: number; lng: number }[] = $state([]);
	mode: 'walk' | 'cycle' | 'drive' = $state('walk');
	summaries: MeasureSummaries = $state(emptySummaries());
	loadFailed: boolean = $state(false);

	enable = () => {
		this.active = true;
		deactivateMapModesExcept('measure');
		dismissEphemeralOverlays();
	};

	disable = () => {
		this.active = false;
		this.clear();
	};

	toggle = () => {
		if (this.active) this.disable();
		else this.enable();
	};

	addWaypoint = (lat: number, lng: number) => {
		this.waypoints = [...this.waypoints, { lat, lng }];
	};

	removeWaypoint = (index: number) => {
		this.waypoints = this.waypoints.filter((_, i) => i !== index);
	};

	undo = () => {
		this.waypoints = this.waypoints.slice(0, -1);
	};

	clear = () => {
		this.waypoints = [];
		this.snapped = [];
		this.summaries = emptySummaries();
	};

	setMode = (mode: 'walk' | 'cycle' | 'drive') => {
		this.mode = mode;
	};

	setResults = (snapped: { lat: number; lng: number }[], summaries: MeasureSummaries) => {
		this.snapped = snapped;
		this.summaries = summaries;
		this.loadFailed = false;
	};
}

export class Building3DStore {
	buildingName: string | null = $state(null);
	initialRoomCode: string | null = $state(null);
	initialEditMode: boolean = $state(false);

	open = (name: string, options?: { roomCode?: string; editMode?: boolean }) => {
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
