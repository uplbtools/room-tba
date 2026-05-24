import { relations } from "drizzle-orm/relations";
import { roomsTable, classesTable, roomPositionsTable, buildingsTable, collegesTable, divisionsTable } from "./schema";

export const classesTableRelations = relations(classesTable, ({one}) => ({
	room: one(roomsTable, {
		fields: [classesTable.roomId],
		references: [roomsTable.id]
	}),
}));

export const roomsTableRelations = relations(roomsTable, ({one, many}) => ({
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

export const roomPositionsRelations = relations(roomPositions, ({one}) => ({
	room: one(rooms, {
		fields: [roomPositions.roomId],
		references: [rooms.id]
	}),
}));

export const buildingsRelations = relations(buildings, ({many}) => ({
	rooms: many(rooms),
}));

export const collegesRelations = relations(collegesTable, ({many}) => ({
	rooms: many(rooms),
}));

export const divisionsRelations = relations(divisions, ({many}) => ({
	rooms: many(rooms),
}));
