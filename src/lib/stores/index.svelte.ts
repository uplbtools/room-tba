// src/lib/store.svelte.ts

import { deactivateMapModesExcept, registerMapMode } from './map/map-modes.js';
import {
	syncTableLabel,
} from './store-types.js';
// import AnnouncementsStore from './AnnouncementStore.svelte';
// import RoomClassesStore from './data/RoomClassesStore.svelte.js';
// import ClassVenuesStore from './data/ClassVenuesStore.svelte.js';
// import TermStore from './data/TermStore.svelte.js';
// import {
// 	AdditionProposalStore,
// 	EditorChromeStore,
// 	EventPlacementStore,
// 	MapEditStore,
// 	MapProposalStore
// } from './editor/editor-stores.svelte';
// import {
// 	Building3DStore,
// 	// MapStore,
// 	// MapToolsStore,
// 	MeasureRouteStore,
// 	TerrainStore,
// 	TrailStore,
// 	TravelTimeStore
// } from './map/map-stores.svelte';
import PlannerStore from './PlannerStore.svelte';
import TransitStore from './map/TransitStore.svelte.js';
import QueryStore from './QueryStore.svelte';
import SidebarStore from './ui/SidebarStore.svelte';
import SidePanelStore from './ui/SidePanelStore.svelte';
import ModalStore from './ui/ModalStore.svelte';
import ToastStore from './ui/ToastStore.svelte';
import FloatingControlPanelStore from './ui/FloatingControlPanelStore.svelte';

export type { MeasureLeg, MeasureSummaries } from './map/map-stores.svelte';

export { deactivateMapModesExcept, syncTableLabel };


export {
	buildingTypeFilter,
	type DormFilterType,
	dormFilter
} from './filter-stores.svelte';

// import { OfflineStore } from './sync/OfflineStore.svelte';
// import SyncToastStore from './sync/SyncToastStore.svelte';
// import AppBootstrapStore from './sync/AppBootstrapStore.svelte';
// import ProposalsStore from './ProposalsStore.svelte';
// import AdminAuthStore from './AdminAuthStore.svelte';
// import JeepneyStore from './map/JeepneyStores.svelte';
// import ScheduleRouteStore from './map/ScheduleRouteStore.svelte';
// import PlannerBuildingsStore from './data/PlannerBuildingsStore.svelte.js';
// import { currentRoom } from './current-room-store.svelte';
// import UserLocation from './map/UserLocation.svelte.js';


// export { currentRoom }
// export const queryStore = new QueryStore();
// export const termStore = new TermStore();
// export const roomClassesStore = new RoomClassesStore();
// export const classVenuesStore = new ClassVenuesStore();
// export const plannerBuildingsStore = new PlannerBuildingsStore();
// export const plannerStore = new PlannerStore(() => termStore.activeTermId);
// export const scheduleRouteStore = new ScheduleRouteStore();
// export const offlineStore = new OfflineStore();
// export const modalStore = new ModalStore();
// export const toastStore = new ToastStore();
// export const userLocation = new UserLocation();
// export const map = new MapStore();
// export const floatingControlPanelStore = new FloatingControlPanelStore();
// export const mapToolsStore = new MapToolsStore();
// export const editorChromeStore = new EditorChromeStore();
// export const mapEditStore = new MapEditStore();
// export const mapProposalStore = new MapProposalStore();
// export const additionProposalStore = new AdditionProposalStore();
// export const eventPlacementStore = new EventPlacementStore();
// export const terrainStore = new TerrainStore();
// export const trailStore = new TrailStore();
// export const travelTimeStore = new TravelTimeStore();
// export const measureRouteStore = new MeasureRouteStore();
// export const jeepneyStore = new JeepneyStore();
// export const transitStore = new TransitStore();
// export const announcementsStore = new AnnouncementsStore();
// export const appBootstrapStore = new AppBootstrapStore();
// export { syncToastStore } from './sync/SyncToastStore.svelte.js';
// export const building3DStore = new Building3DStore();
// export const adminAuthStore = new AdminAuthStore();
// export const proposalsStore = new ProposalsStore();
// export const sidebarStore = new SidebarStore();
// export const sidePanelStore = new SidePanelStore();

// Map modes (edit, jeepney routes, Makiling terrain) are mutually exclusive.
// registerMapMode('edit', {
// 	disable: () => {
// 		mapEditStore.close();
// 		eventPlacementStore.cancel();
// 	}
// });
// registerMapMode('routes', {
// 	disable: () => {
// 		jeepneyStore.disableLayer();
// 	}
// });
// registerMapMode('terrain', {
// 	disable: () => {
// 		terrainStore.disable();
// 	}
// });
// registerMapMode('travel-time', {
// 	disable: () => {
// 		travelTimeStore.disable();
// 	}
// });
// registerMapMode('measure', {
// 	disable: () => {
// 		measureRouteStore.disable();
// 	}
// });
