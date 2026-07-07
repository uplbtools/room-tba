import { sql } from "drizzle-orm";
import {
  pgTable,
  integer,
  text,
  varchar,
  doublePrecision,
  boolean,
  foreignKey,
  numeric,
  timestamp,
  uuid,
  pgEnum,
  jsonb,
  uniqueIndex,
  date,
  time,
} from "drizzle-orm/pg-core";

export const buildingEnum = pgEnum("building_type", ["admin", "non-admin"]);
export const eventCategoryEnum = pgEnum("event_category", [
  "tradition",
  "fair",
  "ceremony",
  "sports",
  "other",
]);
export const eventRecurrenceEnum = pgEnum("event_recurrence", [
  "none",
  "annual",
  "every_1st_sem",
  "every_2nd_sem",
]);
export const eventLocationAnchorEnum = pgEnum("event_location_anchor", [
  "building",
  "dorm",
  "custom",
]);
export const adminRoleEnum = pgEnum("admin_role", [
  "admin",
  "editor",
  "contributor",
]);
export const editProposalStatusEnum = pgEnum("edit_proposal_status", [
  "pending",
  "approved",
  "rejected",
  "needs_changes",
  "withdrawn",
]);

// Academic terms. `id` mirrors the CRS/SAIS term_id (e.g. 1252) rather than
// being auto-generated, so it matches the `term_id` already stored on classes.
export const termsTable = pgTable(
  "terms",
  {
    id: integer().primaryKey(),
    label: text().notNull(),
    schoolYear: varchar("school_year", { length: 16 }),
    // "1" | "2" | "midyear"
    semester: varchar({ length: 12 }),
    startsOn: timestamp("starts_on", { mode: "string" }),
    endsOn: timestamp("ends_on", { mode: "string" }),
    isDefault: boolean("is_default").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    version: integer().default(1).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // At most one term may be the default for anonymous visitors.
    uniqueIndex("terms_single_default")
      .on(table.isDefault)
      .where(sql`${table.isDefault}`),
  ],
);

export const dormsTable = pgTable("dorms", {
  id: integer().primaryKey().generatedByDefaultAsIdentity({
    name: "dorms_id_seq",
    startWith: 1,
    increment: 1,
    minValue: 1,
    maxValue: 2147483647,
    cache: 1,
  }),
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
  imageUrl: text("image_url"),
  version: integer().default(1).notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

export const collegesTable = pgTable("colleges", {
  id: integer().primaryKey().generatedByDefaultAsIdentity({
    name: "colleges_id_seq",
    startWith: 1,
    increment: 1,
    minValue: 1,
    maxValue: 2147483647,
    cache: 1,
  }),
  collegeName: varchar("college_name", { length: 100 }).notNull(),
  version: integer().default(1).notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

export const finalExamsTable = pgTable(
  "final_exams",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity({
      name: "final_exams_id_seq",
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 2147483647,
      cache: 1,
    }),
    termId: integer("term_id").notNull(),
    courseCode: varchar("course_code", { length: 16 }).notNull(),
    section: varchar({ length: 16 }),
    courseTitle: text("course_title"),
    roomId: integer("room_id"),
    examDate: date("exam_date", { mode: "string" }).notNull(),
    startsAt: time("starts_at", { mode: "string" }).notNull(),
    endsAt: time("ends_at", { mode: "string" }).notNull(),
    source: varchar({ length: 64 }).notNull(),
    version: integer().default(1).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.roomId],
      foreignColumns: [roomsTable.id],
      name: "final_exam_room",
    }),
    foreignKey({
      columns: [table.termId],
      foreignColumns: [termsTable.id],
      name: "final_exam_term",
    }),
  ],
);

export const classesTable = pgTable(
  "classes",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity({
      name: "classes_id_seq",
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 2147483647,
      cache: 1,
    }),
    courseCode: varchar("course_code", { length: 16 }),
    section: varchar({ length: 16 }),
    type: varchar({ length: 12 }),
    schedule: text().array(),
    roomId: integer("room_id"),
    courseTitle: text("course_title"),
    termId: integer("term_id"),
    version: integer().default(1).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.roomId],
      foreignColumns: [roomsTable.id],
      name: "class_room",
    }),
  ],
);

export const buildingsTable = pgTable("buildings", {
  id: integer().primaryKey().generatedByDefaultAsIdentity({
    name: "buildings_id_seq",
    startWith: 1,
    increment: 1,
    minValue: 1,
    maxValue: 2147483647,
    cache: 1,
  }),
  buildingName: varchar("building_name", { length: 100 }).notNull(),
  lon: doublePrecision().notNull(),
  buildingType: buildingEnum("type").default("non-admin").notNull(),
  lat: doublePrecision().notNull(),
  directions: text().notNull(),
  imageUrl: text("image_url"),
  version: integer().default(1).notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

export const roomPositionsTable = pgTable(
  "room_positions",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity({
      name: "room_positions_id_seq",
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 2147483647,
      cache: 1,
    }),
    floor: integer().notNull(),
    posX: numeric("pos_x").notNull(),
    posY: numeric("pos_y").notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).notNull(),
    roomId: integer("room_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.roomId],
      foreignColumns: [roomsTable.id],
      name: "room_position_id",
    }),
  ],
);

export const divisionsTable = pgTable(
  "divisions",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity({
      name: "divisions_id_seq",
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 2147483647,
      cache: 1,
    }),
    divisionName: varchar("division_name", { length: 100 }).notNull(),
    collegeId: integer("college_id"),
    version: integer().default(1).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.collegeId],
      foreignColumns: [collegesTable.id],
      name: "division_college",
    }),
  ],
);

export const roomsTable = pgTable(
  "rooms",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity({
      name: "rooms_id_seq",
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 2147483647,
      cache: 1,
    }),
    roomCode: text("room_code").notNull(),
    directions: text(),
    buildingId: integer("building_id"),
    collegeId: integer("college_id"),
    divisionId: integer("division_id"),
    imageUrl: text("image_url"),
    version: integer().default(1).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.buildingId],
      foreignColumns: [buildingsTable.id],
      name: "room_building",
    }),
    foreignKey({
      columns: [table.collegeId],
      foreignColumns: [collegesTable.id],
      name: "room_college",
    }),
    foreignKey({
      columns: [table.divisionId],
      foreignColumns: [divisionsTable.id],
      name: "room_division",
    }),
  ],
);

export const updateTable = pgTable(
  "update",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    tableName: varchar("table_name", { length: 20 }),
    syncKey: uuid("sync_key").defaultRandom(),
  },
  (table) => [uniqueIndex("update_table_name_key").on(table.tableName)],
);

export const adminUsersTable = pgTable(
  "admin_users",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity({
      name: "admin_users_id_seq",
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 2147483647,
      cache: 1,
    }),
    username: varchar({ length: 64 }).notNull(),
    displayName: varchar("display_name", { length: 100 }),
    passwordHash: text("password_hash").notNull(),
    role: adminRoleEnum().default("editor").notNull(),
    email: text(),
    isActive: boolean("is_active").default(true).notNull(),
    supabaseUserId: uuid("supabase_user_id"),
    deletedAt: timestamp("deleted_at", { mode: "string" }),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("admin_users_username_unique").on(table.username)],
);

export const editProposalsTable = pgTable("edit_proposals", {
  id: integer().primaryKey().generatedByDefaultAsIdentity({
    name: "edit_proposals_id_seq",
    startWith: 1,
    increment: 1,
    minValue: 1,
    maxValue: 2147483647,
    cache: 1,
  }),
  entityType: varchar("entity_type", { length: 32 }).notNull(),
  entityId: integer("entity_id").notNull(),
  status: editProposalStatusEnum().default("pending").notNull(),
  proposedPatch: jsonb("proposed_patch").notNull(),
  baseVersion: integer("base_version").notNull(),
  submitterName: varchar("submitter_name", { length: 100 }).notNull(),
  submitterUserId: integer("submitter_user_id").references(
    () => adminUsersTable.id,
  ),
  adminNote: text("admin_note"),
  reviewedBy: varchar("reviewed_by", { length: 100 }),
  reviewedAt: timestamp("reviewed_at", { mode: "string" }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

export const editorHistoryTable = pgTable("editor_history", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  entityType: varchar("entity_type", { length: 32 }).notNull(),
  entityId: integer("entity_id").notNull(),
  action: varchar({ length: 32 }).notNull(),
  before: jsonb("before_snapshot"),
  after: jsonb("after_snapshot"),
  versionBefore: integer("version_before"),
  versionAfter: integer("version_after"),
  editedBy: varchar("edited_by", { length: 100 }).default("admin").notNull(),
  summary: text(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

export const contributionsTable = pgTable("contributions", {
  id: integer().primaryKey().generatedByDefaultAsIdentity({
    name: "contributions_id_seq",
    startWith: 1,
    increment: 1,
    minValue: 1,
    maxValue: 2147483647,
    cache: 1,
  }),
  userId: integer("user_id").references(() => adminUsersTable.id),
  submitterName: varchar("submitter_name", { length: 100 }),
  entityType: varchar("entity_type", { length: 32 }).notNull(),
  entityId: integer("entity_id").notNull(),
  entityLabel: text("entity_label").notNull(),
  source: varchar({ length: 32 }).notNull(),
  proposalId: integer("proposal_id").references(() => editProposalsTable.id),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

export const eventsTable = pgTable(
  "events",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity({
      name: "events_id_seq",
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 2147483647,
      cache: 1,
    }),
    slug: varchar({ length: 120 }).notNull(),
    title: varchar({ length: 160 }).notNull(),
    description: text(),
    category: eventCategoryEnum().default("other").notNull(),
    startsAt: timestamp("starts_at", { mode: "string" }).notNull(),
    endsAt: timestamp("ends_at", { mode: "string" }).notNull(),
    timezone: varchar({ length: 64 }).default("Asia/Manila").notNull(),
    recurrence: eventRecurrenceEnum().default("none").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    sourceUrl: text("source_url"),
    imageUrl: text("image_url"),
    priority: integer().default(0).notNull(),
    includeInSeo: boolean("include_in_seo").default(false).notNull(),
    version: integer().default(1).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("events_slug_unique").on(table.slug)],
);

export const eventLocationsTable = pgTable(
  "event_locations",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity({
      name: "event_locations_id_seq",
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 2147483647,
      cache: 1,
    }),
    eventId: integer("event_id").notNull(),
    anchorType: eventLocationAnchorEnum("anchor_type").notNull(),
    buildingId: integer("building_id"),
    dormId: integer("dorm_id"),
    label: text().notNull(),
    lat: doublePrecision(),
    lon: doublePrecision(),
    highlightPriority: integer("highlight_priority").default(0).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.eventId],
      foreignColumns: [eventsTable.id],
      name: "event_location_event",
    }),
    foreignKey({
      columns: [table.buildingId],
      foreignColumns: [buildingsTable.id],
      name: "event_location_building",
    }),
    foreignKey({
      columns: [table.dormId],
      foreignColumns: [dormsTable.id],
      name: "event_location_dorm",
    }),
  ],
);

export const eventRoutesTable = pgTable(
  "event_routes",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity({
      name: "event_routes_id_seq",
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 2147483647,
      cache: 1,
    }),
    eventId: integer("event_id").notNull(),
    name: varchar({ length: 120 }).notNull(),
    description: text(),
    sortOrder: integer("sort_order").default(0).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.eventId],
      foreignColumns: [eventsTable.id],
      name: "event_route_event",
    }),
  ],
);

export const eventRouteStopsTable = pgTable(
  "event_route_stops",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity({
      name: "event_route_stops_id_seq",
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 2147483647,
      cache: 1,
    }),
    routeId: integer("route_id").notNull(),
    eventLocationId: integer("event_location_id"),
    label: text().notNull(),
    lat: doublePrecision(),
    lon: doublePrecision(),
    sortOrder: integer("sort_order").default(0).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.routeId],
      foreignColumns: [eventRoutesTable.id],
      name: "event_route_stop_route",
    }),
    foreignKey({
      columns: [table.eventLocationId],
      foreignColumns: [eventLocationsTable.id],
      name: "event_route_stop_location",
    }),
  ],
);

// Search aliases / synonyms (e.g. "PhySci" -> Physical Sciences Building),
// including retired names. Seeded from public/room_info.json (#155).
export const aliasesTable = pgTable(
  "aliases",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity({
      name: "aliases_id_seq",
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 2147483647,
      cache: 1,
    }),
    alias: text().notNull(),
    normalizedAlias: text("normalized_alias").notNull(),
    // "building" | "room" | "college" | "division"
    targetType: varchar("target_type", { length: 16 }).notNull(),
    targetId: integer("target_id").notNull(),
    source: varchar({ length: 32 }),
    confidence: varchar({ length: 16 }).default("unverified").notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("aliases_normalized_target").on(
      table.normalizedAlias,
      table.targetType,
      table.targetId,
    ),
  ],
);
