import { pgTable, integer, varchar, numeric, text, foreignKey, timestamp } from "drizzle-orm/pg-core"


export const buildingsTable = pgTable("buildings", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "buildings_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	buildingName: varchar("building_name", { length: 100 }).notNull(),
	lon: numeric().notNull(),
	lat: numeric().notNull(),
	directions: text().notNull(),
});

export const collegesTable = pgTable("colleges", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "colleges_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	collegeName: varchar("college_name", { length: 100 }).notNull(),
});

export const classesTable = pgTable("classes", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "classes_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	courseCode: varchar("course_code", { length: 16 }),
	section: varchar({ length: 16 }),
	type: varchar({ length: 12 }),
	schedule: text().array(),
	roomId: integer("room_id"),
	courseTitle: text("course_title"),
	termId: integer("term_id"),
}, (table) => [
	foreignKey({
			columns: [table.roomId],
			foreignColumns: [rooms.id],
			name: "class_room"
		}),
]);

export const roomPositionsTable = pgTable("room_positions", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "room_positions_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	floor: integer().notNull(),
	posX: numeric("pos_x").notNull(),
	posY: numeric("pos_y").notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
	roomId: integer("room_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.roomId],
			foreignColumns: [rooms.id],
			name: "room_position_id"
		}),
]);

export const divisionsTable = pgTable("divisions", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "divisions_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	divisionName: varchar("division_name", { length: 100 }).notNull(),
});

export const roomsTable = pgTable("rooms", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "rooms_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	roomCode: text("room_code").notNull(),
	directions: text(),
	buildingId: integer("building_id"),
	collegeId: integer("college_id"),
	divisionId: integer("division_id"),
}, (table) => [
	foreignKey({
			columns: [table.buildingId],
			foreignColumns: [buildings.id],
			name: "room_building"
		}),
	foreignKey({
			columns: [table.collegeId],
			foreignColumns: [colleges.id],
			name: "room_college"
		}),
	foreignKey({
			columns: [table.divisionId],
			foreignColumns: [divisions.id],
			name: "room_division"
		}),
]);
