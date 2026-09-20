import { createContext } from 'svelte';
import type {
	Building,
	College,
	Division,
	DormData,
	EventData,
	OrgData,
	PlaceData
} from '$lib/utils/types';
import type { MapStore } from '$lib/stores/map/map-stores.svelte';
import type UserLocation from '$lib/stores/map/UserLocation.svelte';
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
export const [getUserLocation, initUserLocation] = createContext<UserLocation>();