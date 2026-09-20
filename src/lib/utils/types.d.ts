import {
	announcementsTable,
	buildingsTable,
	collegesTable,
	divisionsTable,
	dormsTable,
	eventLocationsTable,
	eventRouteStopsTable,
	eventRoutesTable,
	eventsTable,
	organizationsTable,
	placesTable,
	roomPositionsTable,
	roomsTable,
	termsTable
} from '$lib/server/db/schema';
import type { QueryStoreState } from '../stores/store-types';
import type { EntityPhoto } from './entity/entity-photos';

export type AppData = {
	buildings: {
		[key: string]: {
			rooms: string[];
			directions: string;
			lat: number;
			lon: number;
			osm_link: string;
		};
	};
	colleges: {
		[key: string]: string[];
	};
	divisions: {
		[key: string]: string[];
	};
	rooms: {
		[key: string]: {
			building: string | null;
			college: string | null;
			division: string | null;
			classes: {
				course_code: string;
				section: string;
				type: 'LAB' | 'LEC' | 'SEM';
				schedule: string[];
				course_title: string;
			}[];
		};
	};
};

type Room = typeof roomsTable.$inferSelect

type Building = typeof buildingsTable.$inferSelect;

type BuildingType = typeof buildingsTable.$inferSelect.buildingType;

type ClassMapValue = {
	courseCode: string | null;
	roomCode: string | null;
	section: string | null;
	type: string | null;
	schedule: string[] | null;
	directions: string | null;
	courseTitle: string | null;
	roomId: number | null;
	termId: number | null;
	id: number;
	/** Server-computed hint for unassigned sections (#846); assigned sections never carry it. */
	probableLocation?: import('./probable-location').ProbableLocation | null;
};

type FinalExamRow = {
	id: number;
	termId: number;
	courseCode: string;
	section: string | null;
	courseTitle: string | null;
	roomId: number | null;
	roomCode: string | null;
	examDate: string;
	startsAt: string;
	endsAt: string;
	source: string;
};

type College = typeof collegesTable.$inferSelect;

type Division = typeof divisionsTable.$inferSelect;

type DormData = Omit<typeof dormsTable.$inferSelect, "photos"> & {
  photos?: EntityPhoto[];
};

type OrgData = typeof organizationsTable.$inferSelect;

type PlaceData = typeof placesTable.$inferSelect;

type AnnouncementData = typeof announcementsTable.$inferSelect;

type Term = typeof termsTable.$inferSelect;

// A term plus how many classes are tagged with it, for the term selector UI.
type TermWithCount = Term & { classCount: number };

type EventCategory = typeof eventsTable.$inferSelect.category;

type EventRecurrence = typeof eventsTable.$inferSelect.recurrence;

type EventLocationAnchorType = typeof eventLocationsTable.$inferSelect.anchorType;

type EventStatus = 'active' | 'upcoming' | 'past';

type EventData = typeof eventsTable.$inferSelect & {
	status: EventStatus;
	occurrenceStartsAt: string;
	occurrenceEndsAt: string;
	locations: EventLocationData[];
	routes: EventRouteData[];
};

type EventLocationData = typeof eventLocationsTable.$inferSelect & {
	resolvedLat: number | null;
	resolvedLon: number | null;
	resolvedLabel: string;
	buildingName: string | null;
	dormName: string | null;
};

type EventRouteData = typeof eventRoutesTable.$inferSelect & {
	stops: EventRouteStopData[];
};

type EventRouteStopData = typeof eventRouteStopsTable.$inferSelect & {
	resolvedLat: number | null;
	resolvedLon: number | null;
	resolvedLabel: string;
};

type RoomPosition = typeof roomPositionsTable.$inferSelect;

interface ContributorInfo {
	name: string;
	href?: string;
	img_alt?: string;
}

interface DeveloperInfo {
	name: string;
	href?: string;
	img_alt?: string;
}

interface RecentSearch {
	category: Exclude<QueryStoreState['category'], null>;
	value: string;
	eventSlug?: string;
}

type TableSyncInfo = {
	valid: boolean;
	newKey: string | null;
};

type EntityLoadResult<T> = {
	rows: T[];
	source: 'remote' | 'cache';
};
