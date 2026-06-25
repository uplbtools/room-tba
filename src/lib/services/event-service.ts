import { asc, eq } from "drizzle-orm";
import { getStoredEventOccurrence, getStoredEventStatus } from "../event-time";
import {
  buildingsTable,
  dormsTable,
  eventLocationsTable,
  eventRouteStopsTable,
  eventRoutesTable,
  eventsTable,
} from "../../../drizzle/schema";
import { db } from "../db";
import type {
  BuildingData,
  DormData,
  EventData,
  EventLocationData,
  EventRouteData,
  EventRouteStopData,
} from "../types";

type EventRow = typeof eventsTable.$inferSelect;
type EventLocationRow = typeof eventLocationsTable.$inferSelect;
type EventRouteRow = typeof eventRoutesTable.$inferSelect;
type EventRouteStopRow = typeof eventRouteStopsTable.$inferSelect;

type EventLoadOptions = {
  includeInactive?: boolean;
  now?: Date;
};

export async function getAllEvents(
  options: EventLoadOptions = {},
): Promise<EventData[]> {
  try {
    return hydrateEvents(
      await loadEventRows(options.includeInactive),
      options.now,
    );
  } catch (error) {
    if (isMissingEventsTableError(error)) return [];
    throw error;
  }
}

export async function getActiveEvents(now = new Date()): Promise<EventData[]> {
  return (await getAllEvents({ now })).filter(
    (event) => event.status === "active",
  );
}

export async function getUpcomingEvents(
  now = new Date(),
): Promise<EventData[]> {
  return (await getAllEvents({ now })).filter(
    (event) => event.status === "upcoming",
  );
}

export async function getEventBySlug(
  slug: string,
  options: EventLoadOptions = {},
): Promise<EventData | null> {
  const rows = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.slug, slug))
    .limit(1)
    .catch((error) => {
      if (isMissingEventsTableError(error)) return [];
      throw error;
    });
  const event = rows[0];
  if (!event || (!options.includeInactive && !event.isActive)) return null;
  const hydrated = await hydrateEvents([event], options.now);
  return hydrated[0] ?? null;
}

export async function getEventById(
  id: number,
  options: EventLoadOptions = {},
): Promise<EventData | null> {
  const rows = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.id, id))
    .limit(1)
    .catch((error) => {
      if (isMissingEventsTableError(error)) return [];
      throw error;
    });
  const event = rows[0];
  if (!event || (!options.includeInactive && !event.isActive)) return null;
  const hydrated = await hydrateEvents([event], options.now);
  return hydrated[0] ?? null;
}

export async function getSeoEvents(): Promise<EventData[]> {
  return (await getAllEvents()).filter((event) => event.includeInSeo);
}

async function loadEventRows(includeInactive = false) {
  const rows = await db
    .select()
    .from(eventsTable)
    .orderBy(asc(eventsTable.startsAt));
  return includeInactive ? rows : rows.filter((event) => event.isActive);
}

async function hydrateEvents(
  events: EventRow[],
  now = new Date(),
): Promise<EventData[]> {
  if (events.length === 0) return [];
  const eventIds = new Set(events.map((event) => event.id));
  const [locations, routes, stops, buildings, dorms] = await Promise.all([
    db
      .select()
      .from(eventLocationsTable)
      .orderBy(asc(eventLocationsTable.sortOrder)),
    db.select().from(eventRoutesTable).orderBy(asc(eventRoutesTable.sortOrder)),
    db
      .select()
      .from(eventRouteStopsTable)
      .orderBy(asc(eventRouteStopsTable.sortOrder)),
    db.select().from(buildingsTable),
    db.select().from(dormsTable),
  ]);

  const buildingMap = new Map(
    buildings.map((building) => [building.id, building]),
  );
  const dormMap = new Map(dorms.map((dorm) => [dorm.id, dorm]));
  const locationsByEvent = groupBy(
    locations.filter((location) => eventIds.has(location.eventId)),
    (location) => location.eventId,
  );
  const routesByEvent = groupBy(
    routes.filter((route) => eventIds.has(route.eventId)),
    (route) => route.eventId,
  );
  const stopsByRoute = groupBy(stops, (stop) => stop.routeId);

  return events
    .map((event) => {
      const occurrence = getOccurrenceWindow(event, now);
      const eventLocations = (locationsByEvent.get(event.id) ?? []).map(
        (location) => resolveLocation(location, buildingMap, dormMap),
      );
      const locationMap = new Map(
        eventLocations.map((location) => [location.id, location]),
      );
      const eventRoutes = (routesByEvent.get(event.id) ?? []).map((route) =>
        resolveRoute(route, stopsByRoute.get(route.id) ?? [], locationMap),
      );

      return {
        ...event,
        status: getStoredEventStatus(occurrence, now),
        occurrenceStartsAt: occurrence.startsAt.toISOString(),
        occurrenceEndsAt: occurrence.endsAt.toISOString(),
        locations: eventLocations,
        routes: eventRoutes,
      };
    })
    .sort((a, b) => {
      const priorityDelta = b.priority - a.priority;
      if (priorityDelta !== 0) return priorityDelta;
      return a.occurrenceStartsAt.localeCompare(b.occurrenceStartsAt);
    });
}

function resolveLocation(
  location: EventLocationRow,
  buildingMap: Map<number, BuildingData>,
  dormMap: Map<number, DormData>,
): EventLocationData {
  const building =
    location.anchorType === "building" && location.buildingId !== null
      ? buildingMap.get(location.buildingId)
      : undefined;
  const dorm =
    location.anchorType === "dorm" && location.dormId !== null
      ? dormMap.get(location.dormId)
      : undefined;

  return {
    ...location,
    resolvedLat: building?.lat ?? dorm?.lat ?? location.lat ?? null,
    resolvedLon: building?.lon ?? dorm?.lon ?? location.lon ?? null,
    resolvedLabel:
      location.label ||
      building?.buildingName ||
      dorm?.dormName ||
      "Event marker",
    buildingName: building?.buildingName ?? null,
    dormName: dorm?.dormName ?? null,
  };
}

function resolveRoute(
  route: EventRouteRow,
  stops: EventRouteStopRow[],
  locationMap: Map<number, EventLocationData>,
): EventRouteData {
  return {
    ...route,
    stops: stops.map((stop) => resolveRouteStop(stop, locationMap)),
  };
}

function resolveRouteStop(
  stop: EventRouteStopRow,
  locationMap: Map<number, EventLocationData>,
): EventRouteStopData {
  const location =
    stop.eventLocationId === null
      ? null
      : locationMap.get(stop.eventLocationId);

  return {
    ...stop,
    resolvedLat: location?.resolvedLat ?? stop.lat ?? null,
    resolvedLon: location?.resolvedLon ?? stop.lon ?? null,
    resolvedLabel: stop.label || location?.resolvedLabel || "Route stop",
  };
}

function getOccurrenceWindow(event: EventRow, now: Date) {
  return getStoredEventOccurrence(event, now);
}

function groupBy<T, TKey>(items: T[], getKey: (item: T) => TKey) {
  const grouped = new Map<TKey, T[]>();
  for (const item of items) {
    const key = getKey(item);
    const existing = grouped.get(key);
    if (existing) existing.push(item);
    else grouped.set(key, [item]);
  }
  return grouped;
}

function isMissingEventsTableError(error: unknown) {
  const message = collectErrorMessages(error).join(" ");
  return (
    message.includes('relation "events" does not exist') ||
    message.includes('from "events"') ||
    message.includes("event_locations") ||
    message.includes("event_routes") ||
    message.includes("event_route_stops")
  );
}

function collectErrorMessages(error: unknown): string[] {
  if (!(error instanceof Error)) return [String(error)];
  const messages = [error.message];
  const cause = (error as Error & { cause?: unknown }).cause;
  if (cause) messages.push(...collectErrorMessages(cause));
  return messages;
}
