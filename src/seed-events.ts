import "dotenv/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  eventLocationsTable,
  eventRouteStopsTable,
  eventRoutesTable,
  eventsTable,
} from "../drizzle/schema";

const connectionString = process.env.NEON_CONNECTION_STRING;
if (!connectionString) {
  throw new Error("NEON_CONNECTION_STRING is required to seed events.");
}

const pool = new Pool({ connectionString });
const db = drizzle(pool);

const seedEvents = [
  {
    event: {
      slug: "lantern-parade",
      title: "Lantern Parade",
      description:
        "A seasonal UPLB tradition that brings lantern displays and evening foot traffic around the campus core.",
      category: "tradition" as const,
      startsAt: "2026-12-15T08:00:00+08:00",
      endsAt: "2026-12-15T22:00:00+08:00",
      recurrence: "annual" as const,
      includeInSeo: true,
      priority: 80,
    },
    locations: [
      {
        anchorType: "custom" as const,
        label: "Freedom Park",
        lat: 14.16536,
        lon: 121.24135,
        isPrimary: true,
      },
    ],
    routes: [],
  },
  {
    event: {
      slug: "feb-fair",
      title: "Feb Fair",
      description:
        "Annual February fair season with concerts, booths, and student activities near the UPLB campus core.",
      category: "fair" as const,
      startsAt: "2026-02-12T08:00:00+08:00",
      endsAt: "2026-02-17T23:00:00+08:00",
      recurrence: "annual" as const,
      includeInSeo: true,
      priority: 90,
    },
    locations: [
      {
        anchorType: "custom" as const,
        label: "Freedom Park",
        lat: 14.16536,
        lon: 121.24135,
        isPrimary: true,
      },
    ],
    routes: [],
  },
  {
    event: {
      slug: "graduation-photo-spots",
      title: "Graduation Photo Spots",
      description:
        "Suggested graduation-season photo landmarks around UPLB, including Oble and Baker Hall steps.",
      category: "ceremony" as const,
      startsAt: "2026-06-01T08:00:00+08:00",
      endsAt: "2026-07-31T18:00:00+08:00",
      recurrence: "annual" as const,
      includeInSeo: true,
      priority: 70,
    },
    locations: [
      {
        anchorType: "custom" as const,
        label: "Oblation Plaza",
        lat: 14.16508,
        lon: 121.24204,
        isPrimary: true,
      },
      {
        anchorType: "custom" as const,
        label: "Baker Hall Steps",
        lat: 14.16283,
        lon: 121.2411,
      },
    ],
    routes: [
      {
        name: "Graduation photo walk",
        description: "A short landmark walk for common graduation photo stops.",
        stops: [
          { label: "Oblation Plaza", lat: 14.16508, lon: 121.24204 },
          { label: "Baker Hall Steps", lat: 14.16283, lon: 121.2411 },
        ],
      },
    ],
  },
];

for (const seed of seedEvents) {
  const existing = await db
    .select({ id: eventsTable.id })
    .from(eventsTable)
    .where(eq(eventsTable.slug, seed.event.slug))
    .limit(1);

  let event = existing[0];
  if (!event) {
    [event] = await db.insert(eventsTable).values(seed.event).returning({
      id: eventsTable.id,
    });
  }

  if (!event) continue;

  await db
    .delete(eventLocationsTable)
    .where(eq(eventLocationsTable.eventId, event.id));
  const existingRoutes = await db
    .select({ id: eventRoutesTable.id })
    .from(eventRoutesTable)
    .where(eq(eventRoutesTable.eventId, event.id));
  for (const route of existingRoutes) {
    await db
      .delete(eventRouteStopsTable)
      .where(eq(eventRouteStopsTable.routeId, route.id));
  }
  await db
    .delete(eventRoutesTable)
    .where(eq(eventRoutesTable.eventId, event.id));

  await db
    .update(eventsTable)
    .set({ ...seed.event, updatedAt: new Date().toISOString() })
    .where(eq(eventsTable.id, event.id));

  if (seed.locations.length > 0) {
    await db.insert(eventLocationsTable).values(
      seed.locations.map((location, index) => ({
        eventId: event.id,
        sortOrder: index,
        highlightPriority: seed.event.priority,
        ...location,
      })),
    );
  }

  for (const [routeIndex, route] of seed.routes.entries()) {
    const [insertedRoute] = await db
      .insert(eventRoutesTable)
      .values({
        eventId: event.id,
        name: route.name,
        description: route.description,
        sortOrder: routeIndex,
      })
      .returning({ id: eventRoutesTable.id });

    if (!insertedRoute) continue;
    await db.insert(eventRouteStopsTable).values(
      route.stops.map((stop, stopIndex) => ({
        routeId: insertedRoute.id,
        sortOrder: stopIndex,
        ...stop,
      })),
    );
  }
}

await pool.end();
console.log(`Seeded ${seedEvents.length} events.`);
