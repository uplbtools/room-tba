import type { Component } from 'svelte';
import type { modalOptions } from '$lib/constants/content/modal-states';
import type { Weekday } from '$lib/utils/schedule-import/types.js';

export type LandingModalTab = 'welcome' | 'campus';

export interface ModalStoreState {
	open: boolean;
	type: (typeof modalOptions)[number] | null;
	landingTab?: LandingModalTab;
}

export interface SearchInfoState {
	type: 'query' | 'result';
	category:
		| 'building'
		| 'division'
		| 'college'
		| 'room'
		| 'class'
		| 'classes'
		| 'browse'
		| 'dorm'
		| 'place'
		| 'event'
		| 'events'
		| 'organization'
		| null;
	value: string;
	eventSlug?: string;
}

export type SidebarOpenType =
	| 'map'
	| 'today'
	| 'planner'
	| 'finals'
	| 'calendar'
	| 'contributors'
	| 'settings';

export type RecentSearch = {
	category: Exclude<SearchInfoState['category'], null>;
	value: string;
};

export type FloatingControlPanel = 'legend' | 'building-type' | 'terrain' | 'admin';

export type MapToolsSection = 'view' | 'legend' | 'terrain' | 'trail' | 'schedule' | 'jeepney';

export type MapProposalTarget = {
	type: 'building' | 'dorm' | 'event';
	id: number;
	label: string;
	version: number;
};

export type EventPlacementDraft = {
	slug: string;
	title: string;
	startsAt: string;
	endsAt: string;
	category: 'tradition' | 'fair' | 'ceremony' | 'sports' | 'other';
	imageUrl: string | null;
};

export type TerrainStatus = 'idle' | 'loading' | 'active' | 'unavailable';

export type AppBootstrapPhase = 'idle' | 'local' | 'remote' | 'sync' | 'ready' | 'error';

export type OfflineStatus = 'idle' | 'downloading' | 'done' | 'error' | 'cancelled';

export type SyncInfo = {
	synced: number;
	total: number;
};

export type SyncTableKey =
	| 'buildings'
	| 'colleges'
	| 'divisions'
	| 'dorms'
	| 'events'
	| 'aliases'
	| 'rooms'
	| 'classes';

export type SyncActivity = 'idle' | 'checking' | 'fetching' | 'writing';

const SYNC_TABLE_LABELS: Record<SyncTableKey, string> = {
	buildings: 'building list',
	colleges: 'colleges',
	divisions: 'divisions',
	dorms: 'dorms',
	events: 'events',
	aliases: 'search aliases',
	rooms: 'room stats',
	classes: 'classes'
};

export function syncTableLabel(table: SyncTableKey): string {
	return SYNC_TABLE_LABELS[table];
}

export const ACTIVE_TERM_LS_KEY = 'active-term-id';

export const PLANNER_LS_KEY = 'room-tba-planner';

export const SCHEDULE_IMPORT_SS_KEY = 'room-tba-schedule-import';

export type ScheduleImportPersisted = {
	selectedWeekday: Weekday;
};

export type SidePanelMetaData =
	| {
			type: 'search-result' | 'browsing-entities';
			component: Component;
	  }
	| {
			type: 'admin-suggestions' | 'browsing-events';
	  };
