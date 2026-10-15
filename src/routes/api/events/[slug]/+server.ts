import { error } from '@sveltejs/kit';
import { asc, eq, inArray } from 'drizzle-orm';
import { db } from '#lib/server/db/index.js';
import {
	buildingsTable,
	dormsTable,
	eventLocationsTable,
	eventRouteStopsTable,
	eventRoutesTable,
	eventsTable
} from '#lib/server/db/schema.js';
import type { RequestHandler } from './$types';

// Inlined from astro src/lib/campus-calendar.ts CAMPUS_SEMESTER_MONTHS.
const CAMPUS_SEMESTER_MONTHS: Record<'every_1st_sem' | 'every_2nd_sem', readonly number[]> = {
	every_1st_sem: [8, 9, 10, 11, 12],
	every_2nd_sem: [1, 2, 3, 4, 5]
};

// --- Inlined from astro src/lib/event-time.ts ---------------------------------
// Event timestamps are stored as `timestamp without time zone` wall-clock
// strings in Asia/Manila (fixed UTC+8, no DST).
const CAMPUS_TIME_ZONE = 'Asia/Manila';
const CAMPUS_UTC_OFFSET = '+08:00';
const UPCOMING_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

type WallParts = {
	year: string;
	month: string;
	day: string;
	hour: string;
	minute: string;
	second: string;
};

function parseWallParts(value: string): WallParts | null {
	const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
	if (!match) return null;
	return {
		year: match[1],
		month: match[2],
		day: match[3],
		hour: match[4],
		minute: match[5],
		second: match[6] ?? '00'
	};
}

function getCampusParts(instant: Date): WallParts | null {
	if (Number.isNaN(instant.getTime())) return null;
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: CAMPUS_TIME_ZONE,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false
	}).formatToParts(instant);

	const lookup = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((part) => part.type === type)?.value ?? '';

	let hour = lookup('hour');
	if (hour === '24') hour = '00';

	return {
		year: lookup('year'),
		month: lookup('month'),
		day: lookup('day'),
		hour,
		minute: lookup('minute'),
		second: lookup('second')
	};
}

function campusWallTimeToInstant(value: string): Date {
	const parts = parseWallParts(value);
	if (!parts) return new Date(value);
	const { year, month, day, hour, minute, second } = parts;
	return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}${CAMPUS_UTC_OFFSET}`);
}

function projectCampusOccurrence(
	startWall: string,
	endWall: string,
	now: Date
): { startsAt: Date; endsAt: Date } {
	const start = campusWallTimeToInstant(startWall);
	const end = campusWallTimeToInstant(endWall);
	const duration = Math.max(end.getTime() - start.getTime(), 0);

	const startParts = parseWallParts(startWall);
	const nowParts = getCampusParts(now);
	if (!startParts || !nowParts) return { startsAt: start, endsAt: end };

	const buildStart = (year: number) =>
		campusWallTimeToInstant(
			`${String(year).padStart(4, '0')}-${startParts.month}-${startParts.day}T${startParts.hour}:${startParts.minute}:${startParts.second}`
		);

	let projectedStart = buildStart(Number(nowParts.year));
	let projectedEnd = new Date(projectedStart.getTime() + duration);
	if (projectedEnd.getTime() < now.getTime()) {
		projectedStart = buildStart(Number(nowParts.year) + 1);
		projectedEnd = new Date(projectedStart.getTime() + duration);
	}

	return { startsAt: projectedStart, endsAt: projectedEnd };
}

function projectCampusSemesterOccurrence(
	startWall: string,
	endWall: string,
	now: Date,
	semester: 'every_1st_sem' | 'every_2nd_sem'
): { startsAt: Date; endsAt: Date } {
	const start = campusWallTimeToInstant(startWall);
	const end = campusWallTimeToInstant(endWall);
	const duration = Math.max(end.getTime() - start.getTime(), 0);

	const startParts = parseWallParts(startWall);
	const nowParts = getCampusParts(now);
	if (!startParts || !nowParts) return { startsAt: start, endsAt: end };

	const months = CAMPUS_SEMESTER_MONTHS[semester];
	const inWindow = months.includes(Number(startParts.month));
	const month = inWindow ? startParts.month : String(months[0]).padStart(2, '0');
	const day = inWindow ? startParts.day : '01';

	const buildStart = (year: number) =>
		campusWallTimeToInstant(
			`${String(year).padStart(4, '0')}-${month}-${day}T${startParts.hour}:${startParts.minute}:${startParts.second}`
		);

	const nowYear = Number(nowParts.year);
	for (const year of [nowYear - 1, nowYear, nowYear + 1]) {
		const candidateStart = buildStart(year);
		const candidateEnd = new Date(candidateStart.getTime() + duration);
		if (candidateEnd.getTime() >= now.getTime()) {
			return { startsAt: candidateStart, endsAt: candidateEnd };
		}
	}

	const fallbackStart = buildStart(nowYear + 1);
	return {
		startsAt: fallbackStart,
		endsAt: new Date(fallbackStart.getTime() + duration)
	};
}

function getStoredEventOccurrence(
	event: {
		startsAt: string;
		endsAt: string;
		recurrence: 'none' | 'annual' | 'every_1st_sem' | 'every_2nd_sem';
	},
	now = new Date()
): { startsAt: Date; endsAt: Date } {
	switch (event.recurrence) {
		case 'none':
			return {
				startsAt: campusWallTimeToInstant(event.startsAt),
				endsAt: campusWallTimeToInstant(event.endsAt)
			};
		case 'every_1st_sem':
		case 'every_2nd_sem':
			return projectCampusSemesterOccurrence(event.startsAt, event.endsAt, now, event.recurrence);
		default:
			return projectCampusOccurrence(event.startsAt, event.endsAt, now);
	}
}

function getStoredEventStatus(
	occurrence: { startsAt: Date; endsAt: Date },
	now = new Date()
): 'active' | 'upcoming' | 'past' {
	const nowTime = now.getTime();
	if (occurrence.startsAt.getTime() <= nowTime && occurrence.endsAt.getTime() >= nowTime) {
		return 'active';
	}
	if (
		occurrence.startsAt.getTime() > nowTime &&
		occurrence.startsAt.getTime() - nowTime <= UPCOMING_WINDOW_MS
	) {
		return 'upcoming';
	}
	return 'past';
}

// --- Inlined from astro src/lib/services/event-service.ts ---------------------

const EVENTS_RELATION_NAMES = [
	'events',
	'event_locations',
	'event_routes',
	'event_route_stops'
] as const;

function collectErrorMessages(e: unknown): string[] {
	if (!(e instanceof Error)) return [String(e)];
	const messages = [e.message];
	const cause = (e as Error & { cause?: unknown }).cause;
	if (cause) messages.push(...collectErrorMessages(cause));
	return messages;
}

function isMissingEventsTableError(e: unknown) {
	const message = collectErrorMessages(e).join(' ');
	// Column errors embed "relation \"…\" does not exist" — do not treat as missing table.
	if (/\bcolumn "[^"]+" of relation/.test(message)) return false;
	return EVENTS_RELATION_NAMES.some((name) =>
		message.includes(`relation "${name}" does not exist`)
	);
}

type EventLocationRow = typeof eventLocationsTable.$inferSelect;
type EventRouteStopRow = typeof eventRouteStopsTable.$inferSelect;
type BuildingRow = typeof buildingsTable.$inferSelect;
type DormRow = typeof dormsTable.$inferSelect;
type ResolvedLocation = EventLocationRow & {
	resolvedLat: number | null;
	resolvedLon: number | null;
	resolvedLabel: string;
	buildingName: string | null;
	dormName: string | null;
};

function resolveLocation(
	location: EventLocationRow,
	buildingMap: Map<number, BuildingRow>,
	dormMap: Map<number, DormRow>
): ResolvedLocation {
	const building =
		location.anchorType === 'building' && location.buildingId !== null
			? buildingMap.get(location.buildingId)
			: undefined;
	const dorm =
		location.anchorType === 'dorm' && location.dormId !== null
			? dormMap.get(location.dormId)
			: undefined;

	return {
		...location,
		resolvedLat: building?.lat ?? dorm?.lat ?? location.lat ?? null,
		resolvedLon: building?.lon ?? dorm?.lon ?? location.lon ?? null,
		resolvedLabel: location.label || building?.buildingName || dorm?.dormName || 'Event marker',
		buildingName: building?.buildingName ?? null,
		dormName: dorm?.dormName ?? null
	};
}

function resolveRouteStop(stop: EventRouteStopRow, locationMap: Map<number, ResolvedLocation>) {
	const location = stop.eventLocationId === null ? null : locationMap.get(stop.eventLocationId);

	return {
		...stop,
		resolvedLat: location?.resolvedLat ?? stop.lat ?? null,
		resolvedLon: location?.resolvedLon ?? stop.lon ?? null,
		resolvedLabel: stop.label || location?.resolvedLabel || 'Route stop'
	};
}

export const GET: RequestHandler = async ({ params }) => {
	const slug = params.slug;
	if (!slug) {
		return new Response(JSON.stringify({ error: 'Missing event slug' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		// Inlined getEventBySlug: missing events tables read as "not found".
		const rows = await db
			.select()
			.from(eventsTable)
			.where(eq(eventsTable.slug, slug))
			.limit(1)
			.catch((e) => {
				if (isMissingEventsTableError(e)) return [];
				throw e;
			});
		const event = rows[0];
		if (!event || !event.isActive) {
			return new Response(JSON.stringify({ error: 'Event not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Inlined hydrateEvents for the single event.
		const now = new Date();
		const [locations, routes] = await Promise.all([
			db
				.select()
				.from(eventLocationsTable)
				.where(eq(eventLocationsTable.eventId, event.id))
				.orderBy(asc(eventLocationsTable.sortOrder)),
			db
				.select()
				.from(eventRoutesTable)
				.where(eq(eventRoutesTable.eventId, event.id))
				.orderBy(asc(eventRoutesTable.sortOrder))
		]);

		const routeIds = routes.map((route) => route.id);
		const stops =
			routeIds.length === 0
				? []
				: await db
						.select()
						.from(eventRouteStopsTable)
						.where(inArray(eventRouteStopsTable.routeId, routeIds))
						.orderBy(asc(eventRouteStopsTable.sortOrder));

		const buildingIds = [
			...new Set(
				locations.map((location) => location.buildingId).filter((id): id is number => id !== null)
			)
		];
		const dormIds = [
			...new Set(
				locations.map((location) => location.dormId).filter((id): id is number => id !== null)
			)
		];

		const [buildings, dorms] = await Promise.all([
			buildingIds.length === 0
				? Promise.resolve([] as BuildingRow[])
				: db.select().from(buildingsTable).where(inArray(buildingsTable.id, buildingIds)),
			dormIds.length === 0
				? Promise.resolve([] as DormRow[])
				: db.select().from(dormsTable).where(inArray(dormsTable.id, dormIds))
		]);

		const buildingMap = new Map(buildings.map((building) => [building.id, building]));
		const dormMap = new Map(dorms.map((dorm) => [dorm.id, dorm]));

		const occurrence = getStoredEventOccurrence(event, now);
		const eventLocations = locations.map((location) =>
			resolveLocation(location, buildingMap, dormMap)
		);
		const locationMap = new Map(eventLocations.map((location) => [location.id, location]));
		const eventRoutes = routes.map((route) => ({
			...route,
			stops: stops
				.filter((stop) => stop.routeId === route.id)
				.map((stop) => resolveRouteStop(stop, locationMap))
		}));

		const hydrated = {
			...event,
			status: getStoredEventStatus(occurrence, now),
			occurrenceStartsAt: occurrence.startsAt.toISOString(),
			occurrenceEndsAt: occurrence.endsAt.toISOString(),
			locations: eventLocations,
			routes: eventRoutes
		};

		return new Response(JSON.stringify(hydrated), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (e) {
		console.error(e);
		throw error(500, {
			message: 'Failed to load event'
		});
	}
};
