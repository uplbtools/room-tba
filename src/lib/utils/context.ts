import { createContext } from 'svelte';
import type {
	Building,
	College,
	Division,
	DormData,
	EventData,
	OrgData,
	PlaceData
} from '#lib/utils/types.d.ts';
import type {
	MapStore,
	MapToolsStore,
	MeasureRouteStore,
	TerrainStore,
	TrailStore,
	TravelTimeStore
} from '#lib/stores/new/map/map-stores.svelte.js';
import type UserLocation from '#lib/stores/new/map/UserLocation.svelte.js';
import type SearchInfo from '#lib/stores/SearchInfo.svelte.js';
import type ToastStore from '#lib/stores/new/ui/ToastStore.svelte.ts';
import type ModalStore from '#lib/stores/new/ui/ModalStore.svelte.ts';
import type FloatingControlPanelStore from '#lib/stores/new/ui/FloatingControlPanelStore.svelte.js';
import type EscapeActions from '#lib/stores/new/ui/EscapeActionStack.svelte.ts';
import type TermStore from '#lib/stores/new/data/TermStore.svelte.ts';
import type PlannerStore from '#lib/stores/new/data/PlannerStore.svelte.ts';
import type AdminAuthStore from '#lib/stores/new/data/AdminAuthStore.svelte.ts';
import type ProposalsStore from '#lib/stores/new/data/ProposalsStore.svelte.ts';
import type OfflineStore from '#lib/stores/new/data/OfflineStore.svelte.ts';
export type AppContextData =
	| {
			buildings: Building[];
			colleges: College[];
			divisions: Division[];
			dorms: DormData[];
			events: EventData[];
			organizations: OrgData[];
			places: PlaceData[];
			totalRooms: number;
			directionCount: number;
			loaded: true;
	  }
	| {
			buildings: null;
			colleges: null;
			divisions: null;
			dorms: null;
			events: null;
			organizations: null;
			places: null;
			totalRooms: null;
			directionCount: null;
			loaded: false;
	  };
export type DBData = Omit<AppContextData, 'loaded'>;

export type AppActions = {
	replaceEvent: (event: EventData) => void;
	removeEvent: (eventId: number) => void;
	upsertBuilding: (building: Building) => void;
	upsertDorm: (dorm: DormData) => void;
	upsertCollege: (college: College) => void;
	upsertDivision: (division: Division) => void;
	upsertOrganization: (org: OrgData) => void;
	upsertPlace: (place: PlaceData) => void;
};

export const [getAppData, setAppData] = createContext<() => AppContextData>();
export const [getAppActions, setAppActions] = createContext<AppActions>();
export const [getMapStore, initMapStore] = createContext<MapStore>();
export const [getTravelTimeStore, initTravelTimeStore] = createContext<TravelTimeStore>();
export const [getMapToolsStore, initMapToolsStore] = createContext<MapToolsStore>();
export const [getMeasureRouteStore, initMeasureRouteStore] = createContext<MeasureRouteStore>();
export const [getTrailStore, initTrailStore] = createContext<TrailStore>();
export const [getTerrainStore, initTerrainStore] = createContext<TerrainStore>();
export const [getFloatingControlPanelStore, initFloatingControlPanelStore] =
	createContext<FloatingControlPanelStore>();
export const [getUserLocation, initUserLocation] = createContext<UserLocation>();
export const [getSearchInfo, initSearchInfo] = createContext<SearchInfo>();
export const [getToast, initToast] = createContext<ToastStore>();
export const [getModalStore, initModalStore] = createContext<ModalStore>();
export const [getEscapeActions, initEscapeActions] = createContext<EscapeActions>();
export const [getTermStore, initTermStore] = createContext<TermStore>();
export const [getPlannerStore, initPlannerStore] = createContext<PlannerStore>();
export const [getAdminAuthStore, initAdminAuthStore] = createContext<AdminAuthStore>();
export const [getProposalsStore, initProposalsStore] = createContext<ProposalsStore>();
export const [getOfflineStore, initOfflineStore] = createContext<OfflineStore>();
