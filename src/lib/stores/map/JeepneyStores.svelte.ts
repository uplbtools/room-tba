import { campusTransit } from '#lib/campus.config.js';
import { buildingTypeFilter, mapToolsStore, modalStore, sidePanelStore } from '../index.svelte';
import { deactivateMapModesExcept } from './map-modes';

export default class JeepneyStore {
	/** Transit/jeepney layer visible (search chip or map tools). */
	layerActive: boolean = $state(false);
	selectedRouteId: string | null = $state(null);
	menuOpen: boolean = $state(false);
	selectedStopIndex: number | null = $state(null);
	hoveredStopIndex: number | null = $state(null);
	/** Route shown in the jeepney-route modal (independent of the map layer). */
	modalRouteId: string | null = $state(null);

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
		if (!campusTransit.enabled) return;
		this.layerActive = true;
		mapToolsStore.close();
		deactivateMapModesExcept('routes');
		// Transit is mutually exclusive with building/dorm pin filters: reset to
		// All so filtered pins don't overlap jeepney routes/stops (#325). This
		// covers every enable path (search chip, map tools flyout, route picker).
		buildingTypeFilter.set('all');
	};

	disableLayer = () => {
		this.layerActive = false;
		this.selectedRouteId = null;
		this.menuOpen = false;
		this.closeStop();
	};

	selectRoute = (id: string) => {
		if (!campusTransit.enabled) return;
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
			deactivateMapModesExcept('routes');
		}
	};

	clearRoute = () => {
		this.selectedRouteId = null;
		this.closeStop();
	};

	/** Activate the layer with `id` selected (no toggle, unlike selectRoute). */
	openRouteOnMap = (id: string) => {
		if (!campusTransit.enabled) return;
		this.enableLayer();
		if (this.selectedRouteId !== id) this.closeStop();
		this.selectedRouteId = id;
		this.menuOpen = false;
	};

	openRouteModal = (id: string) => {
		if (!campusTransit.enabled) return;
		this.modalRouteId = id;
		modalStore.openModal('jeepney-route');
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
