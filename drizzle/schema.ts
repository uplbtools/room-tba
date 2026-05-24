import { pgTable, integer, text, varchar, doublePrecision, boolean, foreignKey, numeric, timestamp } from "drizzle-orm/pg-core"



export const dormsTable = pgTable("dorms", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "dorms_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	dormName: text("dorm_name").notNull(),
	shortName: varchar("short_name", { length: 48 }),
	lat: doublePrecision(),
	lon: doublePrecision(),
	gender: text().notNull(),
	capacity: integer(),
	managingOffice: text("managing_office"),
	contactEmail: text("contact_email"),
	amenities: text().array(),
	osmLink: text("osm_link"),
	description: text(),
	isUpManaged: boolean("is_up_managed").default(true),
	priceRange: text("price_range"),
	contactPhone: varchar("contact_phone", { length: 20 }).array(),
	facebookLink: text("facebook_link"),
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
			foreignColumns: [roomsTable.id],
			name: "class_room"
		}),
]);

export const buildingsTable = pgTable("buildings", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "buildings_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	buildingName: varchar("building_name", { length: 100 }).notNull(),
	lon: doublePrecision().notNull(),
	lat: doublePrecision().notNull(),
	directions: text().notNull(),
});

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
			foreignColumns: [roomsTable.id],
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
			foreignColumns: [buildingsTable.id],
			name: "room_building"
		}),
	foreignKey({
			columns: [table.collegeId],
			foreignColumns: [collegesTable.id],
			name: "room_college"
		}),
	foreignKey({
			columns: [table.divisionId],
			foreignColumns: [divisionsTable.id],
			name: "room_division"
		}),
]);
