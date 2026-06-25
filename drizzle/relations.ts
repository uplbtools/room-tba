import { relations } from "drizzle-orm/relations";
import {
  roomsTable,
  classesTable,
  roomPositionsTable,
  buildingsTable,
  collegesTable,
  divisionsTable,
  eventsTable,
  eventLocationsTable,
  eventRoutesTable,
  eventRouteStopsTable,
  dormsTable,
} from "./schema";

export const classesRelations = relations(classesTable, ({ one }) => ({
  room: one(roomsTable, {
    fields: [classesTable.roomId],
    references: [roomsTable.id],
  }),
}));

export const roomsRelations = relations(roomsTable, ({ one, many }) => ({
  classes: many(classesTable),
  roomPositions: many(roomPositionsTable),
  building: one(buildingsTable, {
    fields: [roomsTable.buildingId],
    references: [buildingsTable.id],
  }),
  college: one(collegesTable, {
    fields: [roomsTable.collegeId],
    references: [collegesTable.id],
  }),
  division: one(divisionsTable, {
    fields: [roomsTable.divisionId],
    references: [divisionsTable.id],
  }),
}));

export const roomPositionsRelations = relations(
  roomPositionsTable,
  ({ one }) => ({
    room: one(roomsTable, {
      fields: [roomPositionsTable.roomId],
      references: [roomsTable.id],
    }),
  }),
);

export const buildingsRelations = relations(buildingsTable, ({ many }) => ({
  rooms: many(roomsTable),
  eventLocations: many(eventLocationsTable),
}));

export const dormsRelations = relations(dormsTable, ({ many }) => ({
  eventLocations: many(eventLocationsTable),
}));

export const collegesRelations = relations(collegesTable, ({ many }) => ({
  rooms: many(roomsTable),
}));

export const divisionsRelations = relations(divisionsTable, ({ many }) => ({
  rooms: many(roomsTable),
}));

export const eventsRelations = relations(eventsTable, ({ many }) => ({
  locations: many(eventLocationsTable),
  routes: many(eventRoutesTable),
}));

export const eventLocationsRelations = relations(
  eventLocationsTable,
  ({ one, many }) => ({
    event: one(eventsTable, {
      fields: [eventLocationsTable.eventId],
      references: [eventsTable.id],
    }),
    building: one(buildingsTable, {
      fields: [eventLocationsTable.buildingId],
      references: [buildingsTable.id],
    }),
    dorm: one(dormsTable, {
      fields: [eventLocationsTable.dormId],
      references: [dormsTable.id],
    }),
    routeStops: many(eventRouteStopsTable),
  }),
);

export const eventRoutesRelations = relations(
  eventRoutesTable,
  ({ one, many }) => ({
    event: one(eventsTable, {
      fields: [eventRoutesTable.eventId],
      references: [eventsTable.id],
    }),
    stops: many(eventRouteStopsTable),
  }),
);

export const eventRouteStopsRelations = relations(
  eventRouteStopsTable,
  ({ one }) => ({
    route: one(eventRoutesTable, {
      fields: [eventRouteStopsTable.routeId],
      references: [eventRoutesTable.id],
    }),
    location: one(eventLocationsTable, {
      fields: [eventRouteStopsTable.eventLocationId],
      references: [eventLocationsTable.id],
    }),
  }),
);
