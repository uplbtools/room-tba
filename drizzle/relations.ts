import { relations } from "drizzle-orm/relations";
import { roomsTable, classesTable, roomPositionsTable, buildingsTable, collegesTable, divisionsTable } from "./schema";

export const classesRelations = relations(classesTable, ({one}) => ({
	room: one(roomsTable, {
		fields: [classesTable.roomId],
		references: [roomsTable.id]
	}),
}));

export const roomsRelations = relations(roomsTable, ({one, many}) => ({
	classes: many(classesTable),
	roomPositions: many(roomPositionsTable),
	building: one(buildingsTable, {
		fields: [roomsTable.buildingId],
		references: [buildingsTable.id]
	}),
	college: one(collegesTable, {
		fields: [roomsTable.collegeId],
		references: [collegesTable.id]
	}),
	division: one(divisionsTable, {
		fields: [roomsTable.divisionId],
		references: [divisionsTable.id]
	}),
}));

export const roomPositionsRelations = relations(roomPositionsTable, ({one}) => ({
	room: one(roomsTable, {
		fields: [roomPositionsTable.roomId],
		references: [roomsTable.id]
	}),
}));

export const buildingsRelations = relations(buildingsTable, ({many}) => ({
	rooms: many(roomsTable),
}));

export const collegesRelations = relations(collegesTable, ({many}) => ({
	rooms: many(roomsTable),
}));

export const divisionsRelations = relations(divisionsTable, ({many}) => ({
	rooms: many(roomsTable),
}));
