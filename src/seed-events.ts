import "dotenv/config";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  buildingsTable,
  collegesTable,
  divisionsTable,
  eventLocationsTable,
  eventRouteStopsTable,
  eventRoutesTable,
  eventsTable,
  roomsTable,
  updateTable,
} from "../drizzle/schema";

const connectionString = process.env.NEON_CONNECTION_STRING;
if (!connectionString) {
  throw new Error("NEON_CONNECTION_STRING is required to seed events.");
}

const pool = new Pool({ connectionString });
const db = drizzle(pool);
const SYNC_TABLES = [
  "rooms",
  "events",
  "event_locations",
  "event_routes",
  "event_route_stops",
];

const legacySeedEventSlugs = [
  "lantern-parade",
  "feb-fair",
  "graduation-photo-spots",
];

const specialRooms = [
  {
    roomCode: "NCAS Auditorium",
    directions: "NCAS Auditorium in CAS Annex 1.",
    buildingName: "CAS Annex 1",
    collegeName: "College of Arts and Sciences",
    divisionName: "Institute of Computer Science",
  },
];

const seedEvents = [
  {
    event: {
      slug: "university-graduation-2026",
      title: "University Graduation",
      description: "UPLB University Graduation ceremony at Copeland Gymnasium.",
      category: "ceremony" as const,
      startsAt: "2026-07-04T08:00:00+08:00",
      endsAt: "2026-07-04T17:00:00+08:00",
      recurrence: "none" as const,
      includeInSeo: true,
      priority: 100,
    },
    locations: [
      {
        anchorType: "building" as const,
        buildingName: "Copeland Gymnasium",
        label: "Copeland Gymnasium",
        isPrimary: true,
      },
    ],
    routes: [],
  },
  {
    event: {
      slug: "institute-of-computer-science-testimonials-2026",
      title: "Institute of Computer Science Testimonials",
      description:
        "Institute of Computer Science testimonials at NCAS Auditorium in CAS Annex 1.",
      category: "ceremony" as const,
      startsAt: "2026-07-01T14:00:00+08:00",
      endsAt: "2026-07-01T17:00:00+08:00",
      recurrence: "none" as const,
      includeInSeo: true,
      priority: 95,
    },
    locations: [
      {
        anchorType: "building" as const,
        buildingName: "CAS Annex 1",
        label: "NCAS Auditorium",
        isPrimary: true,
      },
    ],
    routes: [],
  },
  {
    event: {
      slug: "uplb-cas-testimonials-2026",
      title: "UPLB CAS Testimonials",
      description: "UPLB College of Arts and Sciences testimonials.",
      category: "ceremony" as const,
      startsAt: "2026-07-02T07:30:00+08:00",
      endsAt: "2026-07-02T12:00:00+08:00",
      recurrence: "none" as const,
      includeInSeo: true,
      priority: 90,
    },
    locations: [
      {
        anchorType: "building" as const,
        buildingName: "Copeland Gymnasium",
        label: "Copeland Gymnasium",
        isPrimary: true,
      },
    ],
    routes: [],
  },
];

async function getBuildingId(buildingName: string) {
  const [building] = await db
    .select({ id: buildingsTable.id })
    .from(buildingsTable)
    .where(eq(buildingsTable.buildingName, buildingName))
    .limit(1);
  if (!building) throw new Error(`Missing building: ${buildingName}`);
  return building.id;
}

async function getCollegeId(collegeName: string) {
  const [college] = await db
    .select({ id: collegesTable.id })
    .from(collegesTable)
    .where(eq(collegesTable.collegeName, collegeName))
    .limit(1);
  if (!college) throw new Error(`Missing college: ${collegeName}`);
  return college.id;
}

async function getDivisionId(divisionName: string) {
  const [division] = await db
    .select({ id: divisionsTable.id })
    .from(divisionsTable)
    .where(eq(divisionsTable.divisionName, divisionName))
    .limit(1);
  return division?.id ?? null;
}

for (const room of specialRooms) {
  const buildingId = await getBuildingId(room.buildingName);
  const collegeId = await getCollegeId(room.collegeName);
  const divisionId = await getDivisionId(room.divisionName);
  const [existingRoom] = await db
    .select({ id: roomsTable.id })
    .from(roomsTable)
    .where(eq(roomsTable.roomCode, room.roomCode))
    .limit(1);

  const values = {
    roomCode: room.roomCode,
    directions: room.directions,
    buildingId,
    collegeId,
    divisionId,
    updatedAt: new Date().toISOString(),
  };

  if (existingRoom) {
    await db
      .update(roomsTable)
      .set(values)
      .where(eq(roomsTable.id, existingRoom.id));
  } else {
    await db.insert(roomsTable).values(values);
  }
}

for (const slug of legacySeedEventSlugs) {
  await db
    .update(eventsTable)
    .set({ isActive: false, updatedAt: new Date().toISOString() })
    .where(eq(eventsTable.slug, slug));
}

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
    const locations = await Promise.all(
      seed.locations.map(async (location, index) => ({
        eventId: event.id,
        sortOrder: index,
        highlightPriority: seed.event.priority,
        anchorType: location.anchorType,
        buildingId: location.buildingName
          ? await getBuildingId(location.buildingName)
          : null,
        label: location.label,
        isPrimary: location.isPrimary ?? false,
      })),
    );
    await db.insert(eventLocationsTable).values(locations);
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

for (const tableName of SYNC_TABLES) {
  await db
    .update(updateTable)
    .set({ syncKey: randomUUID() })
    .where(eq(updateTable.tableName, tableName));
}

await pool.end();
console.log(`Seeded ${seedEvents.length} events.`);
