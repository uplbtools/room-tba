import { pgTable, integer, text, varchar, doublePrecision, timestamp, index, bigserial, boolean, uniqueIndex, foreignKey, uuid, jsonb, date, time, unique, numeric, pgEnum, check } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const adminRole = pgEnum("admin_role", ['admin', 'editor', 'contributor'])
export const buildingType = pgEnum("building_type", ['admin', 'non-admin'])
export const editProposalStatus = pgEnum("edit_proposal_status", ['pending', 'approved', 'rejected', 'needs_changes', 'withdrawn'])
export const eventCategory = pgEnum("event_category", ['tradition', 'fair', 'ceremony', 'sports', 'other'])
export const eventLocationAnchor = pgEnum("event_location_anchor", ['building', 'dorm', 'custom'])
export const eventRecurrence = pgEnum("event_recurrence", ['none', 'annual', 'every_1st_sem', 'every_2nd_sem'])
export const contributorSocialKind = pgEnum("contributor_social_kind", ['github', 'website', 'discord', 'messenger', 'linkedin', 'custom'])
export const contributorProfileAuditAction = pgEnum("contributor_profile_audit_action", ['create', 'update', 'publish', 'hide', 'restore', 'remove_link'])


export const places = pgTable("places", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "places_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	name: text().notNull(),
	category: varchar({ length: 24 }).notNull(),
	lat: doublePrecision(),
	lon: doublePrecision(),
	description: text(),
	hours: text(),
	websiteLink: text("website_link"),
	facebookLink: text("facebook_link"),
	imageUrl: text("image_url"),
	version: integer().default(1).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const sponsorImpressions = pgTable("sponsor_impressions", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	sponsorId: text("sponsor_id").notNull(),
	zone: text().notNull(),
	eventType: text("event_type").default('impression').notNull(),
	recordedAt: timestamp("recorded_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	userAgent: text("user_agent"),
	pagePath: text("page_path"),
}, (table) => [
	index("idx_sponsor_imp_sponsor_date").using("btree", table.sponsorId.asc().nullsLast().op("text_ops"), table.recordedAt.asc().nullsLast().op("text_ops")),
	index("idx_sponsor_imp_zone_date").using("btree", table.zone.asc().nullsLast().op("timestamptz_ops"), table.recordedAt.asc().nullsLast().op("timestamptz_ops")),
]);

export const jeepneyRoutes = pgTable("jeepney_routes", {
	id: varchar({ length: 64 }).primaryKey().notNull(),
	name: varchar({ length: 120 }).notNull(),
	description: text().notNull(),
	directionNote: text("direction_note"),
	color: varchar({ length: 16 }).notNull(),
	fareRegular: doublePrecision("fare_regular").notNull(),
	fareDiscounted: doublePrecision("fare_discounted").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	version: integer().default(1).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const jeepneyStops = pgTable("jeepney_stops", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "jeepney_stops_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	routeId: varchar("route_id", { length: 64 }).notNull(),
	name: varchar({ length: 160 }).notNull(),
	description: text().notNull(),
	lat: doublePrecision().notNull(),
	lon: doublePrecision().notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	version: integer().default(1).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("jeepney_stops_route_sort_order").using("btree", table.routeId.asc().nullsLast().op("int4_ops"), table.sortOrder.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.routeId],
			foreignColumns: [jeepneyRoutes.id],
			name: "jeepney_stops_route_id_jeepney_routes_id_fk"
		}).onDelete("cascade"),
]);

export const presence = pgTable("presence", {
	sid: varchar({ length: 64 }).primaryKey().notNull(),
	lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_presence_last_seen").using("btree", table.lastSeenAt.asc().nullsLast().op("timestamptz_ops")),
]);

export const dorms = pgTable("dorms", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "dorms_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	dormName: text("dorm_name").notNull(),
	shortName: varchar("short_name", { length: 48 }),
	lat: doublePrecision(),
	lon: doublePrecision(),
	gender: text(),
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
	version: integer().default(1).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	imageUrl: text("image_url"),
});

export const rooms = pgTable("rooms", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "rooms_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	roomCode: text("room_code").notNull(),
	directions: text(),
	buildingId: integer("building_id"),
	collegeId: integer("college_id"),
	divisionId: integer("division_id"),
	version: integer().default(1).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	imageUrl: text("image_url"),
	category: varchar({ length: 24 }),
	fullName: text("full_name"),
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

export const classes = pgTable("classes", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "classes_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	courseCode: varchar("course_code", { length: 16 }),
	section: varchar({ length: 16 }),
	type: varchar({ length: 12 }),
	schedule: text().array(),
	roomId: integer("room_id"),
	courseTitle: text("course_title"),
	termId: integer("term_id"),
	version: integer().default(1).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	acadGroup: varchar("acad_group", { length: 8 }),
	acadOrg: varchar("acad_org", { length: 16 }),
}, (table) => [
	index("classes_term_course_section_id_idx").using("btree", sql`term_id`, sql`COALESCE(course_code, ''::character varying)`, sql`COALESCE(section, ''::character varying)`, sql`id`),
	foreignKey({
			columns: [table.roomId],
			foreignColumns: [rooms.id],
			name: "class_room"
		}),
]);

export const organizations = pgTable("organizations", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "organizations_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	name: text().notNull(),
	category: varchar({ length: 24 }).notNull(),
	buildingId: integer("building_id"),
	roomId: integer("room_id"),
	lat: doublePrecision(),
	lon: doublePrecision(),
	description: text(),
	websiteLink: text("website_link"),
	facebookLink: text("facebook_link"),
	email: text(),
	imageUrl: text("image_url"),
	version: integer().default(1).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	bio: text(),
	orgType: varchar("org_type", { length: 32 }),
	establishedYear: varchar("established_year", { length: 8 }),
	memberCount: varchar("member_count", { length: 16 }),
});

export const colleges = pgTable("colleges", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "colleges_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	collegeName: varchar("college_name", { length: 100 }).notNull(),
	version: integer().default(1).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	websiteLink: text("website_link"),
});

export const divisions = pgTable("divisions", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "divisions_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	divisionName: varchar("division_name", { length: 100 }).notNull(),
	version: integer().default(1).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	collegeId: integer("college_id"),
	websiteLink: text("website_link"),
}, (table) => [
	foreignKey({
			columns: [table.collegeId],
			foreignColumns: [colleges.id],
			name: "division_college"
		}),
]);

export const eventLocations = pgTable("event_locations", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "event_locations_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	eventId: integer("event_id").notNull(),
	anchorType: eventLocationAnchor("anchor_type").notNull(),
	buildingId: integer("building_id"),
	dormId: integer("dorm_id"),
	label: text().notNull(),
	lat: doublePrecision(),
	lon: doublePrecision(),
	highlightPriority: integer("highlight_priority").default(0).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	isPrimary: boolean("is_primary").default(false).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.buildingId],
			foreignColumns: [buildings.id],
			name: "event_location_building"
		}),
	foreignKey({
			columns: [table.dormId],
			foreignColumns: [dorms.id],
			name: "event_location_dorm"
		}),
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [events.id],
			name: "event_location_event"
		}),
]);

export const schemaMigrations = pgTable("schema_migrations", {
	filename: text().primaryKey().notNull(),
	appliedAt: timestamp("applied_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const events = pgTable("events", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "events_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	slug: varchar({ length: 120 }).notNull(),
	title: varchar({ length: 160 }).notNull(),
	description: text(),
	category: eventCategory().default('other').notNull(),
	startsAt: timestamp("starts_at", { mode: 'string' }).notNull(),
	endsAt: timestamp("ends_at", { mode: 'string' }).notNull(),
	timezone: varchar({ length: 64 }).default('Asia/Manila').notNull(),
	recurrence: eventRecurrence().default('none').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	sourceUrl: text("source_url"),
	priority: integer().default(0).notNull(),
	includeInSeo: boolean("include_in_seo").default(false).notNull(),
	version: integer().default(1).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	imageUrl: text("image_url"),
}, (table) => [
	uniqueIndex("events_slug_unique").using("btree", table.slug.asc().nullsLast().op("text_ops")),
]);

export const update = pgTable("update", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "update_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	tableName: varchar("table_name", { length: 20 }),
	syncKey: uuid("sync_key").defaultRandom(),
}, (table) => [
	uniqueIndex("update_table_name_key").using("btree", table.tableName.asc().nullsLast().op("text_ops")),
]);

export const editProposals = pgTable("edit_proposals", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "edit_proposals_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	entityType: varchar("entity_type", { length: 32 }).notNull(),
	entityId: integer("entity_id").notNull(),
	status: editProposalStatus().default('pending').notNull(),
	proposedPatch: jsonb("proposed_patch").notNull(),
	baseVersion: integer("base_version").notNull(),
	submitterName: varchar("submitter_name", { length: 100 }).notNull(),
	submitterUserId: integer("submitter_user_id"),
	adminNote: text("admin_note"),
	reviewedBy: varchar("reviewed_by", { length: 100 }),
	reviewedAt: timestamp("reviewed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	submitterNote: text("submitter_note"),
}, (table) => [
	foreignKey({
			columns: [table.submitterUserId],
			foreignColumns: [adminUsers.id],
			name: "edit_proposals_submitter_user_id_admin_users_id_fk"
		}),
]);

export const adminUsers = pgTable("admin_users", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "admin_users_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	username: varchar({ length: 64 }).notNull(),
	displayName: varchar("display_name", { length: 100 }),
	passwordHash: text("password_hash").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	role: adminRole().default('editor').notNull(),
	supabaseUserId: uuid("supabase_user_id"),
	email: text(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	avatarUrl: text("avatar_url"),
	profileUrl: text("profile_url"),
	showInCredits: boolean("show_in_credits").default(true).notNull(),
	legacyCredit: boolean("legacy_credit").default(false).notNull(),
}, (table) => [
	uniqueIndex("admin_users_username_unique").using("btree", table.username.asc().nullsLast().op("text_ops")),
]);
export const contributorProfiles = pgTable("contributor_profiles", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "contributor_profiles_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	userId: integer("user_id").notNull(),
	slug: varchar({ length: 120 }).notNull(),
	bio: varchar({ length: 280 }).default('').notNull(),
	isPublic: boolean("is_public").default(true).notNull(),
	isModeratorHidden: boolean("is_moderator_hidden").default(false).notNull(),
	version: integer().default(1).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("contributor_profiles_user_id_unique").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	uniqueIndex("contributor_profiles_slug_unique").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	check("contributor_profiles_bio_length", sql`char_length(${table.bio}) <= 280`),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [adminUsers.id],
		name: "contributor_profiles_user_id_admin_users_id_fk"
	}),
]);

export const contributorSocialLinks = pgTable("contributor_social_links", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "contributor_social_links_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	profileId: integer("profile_id").notNull(),
	kind: contributorSocialKind().notNull(),
	label: varchar({ length: 40 }),
	url: varchar({ length: 2048 }).notNull(),
	isPublic: boolean("is_public").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("contributor_social_links_profile_idx").using("btree", table.profileId.asc().nullsLast().op("int4_ops")),
	uniqueIndex("contributor_social_links_known_kind_unique").using("btree", table.profileId.asc().nullsLast().op("int4_ops"), table.kind.asc().nullsLast().op("enum_ops")).where(sql`${table.kind} in ('github', 'discord', 'messenger', 'linkedin')`),
	check("contributor_social_links_https_url", sql`${table.url} ~ '^https://'`),
	check("contributor_social_links_custom_label", sql`${table.kind} <> 'custom' OR (${table.label} IS NOT NULL AND char_length(trim(${table.label})) > 0)`),
	foreignKey({
		columns: [table.profileId],
		foreignColumns: [contributorProfiles.id],
		name: "contributor_social_links_profile_id_contributor_profiles_id_fk"
	}).onDelete("cascade"),
]);

export const contributorProfileAudits = pgTable("contributor_profile_audits", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "contributor_profile_audits_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	profileId: integer("profile_id").notNull(),
	actorUserId: integer("actor_user_id"),
	action: contributorProfileAuditAction().notNull(),
	fromVersion: integer("from_version"),
	toVersion: integer("to_version").notNull(),
	before: jsonb(),
	after: jsonb().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("contributor_profile_audits_profile_created_idx").using("btree", table.profileId.asc().nullsLast().op("int4_ops"), table.createdAt.desc().nullsLast().op("timestamptz_ops")),
	index("contributor_profile_audits_actor_idx").using("btree", table.actorUserId.asc().nullsLast().op("int4_ops")),
	foreignKey({
		columns: [table.profileId],
		foreignColumns: [contributorProfiles.id],
		name: "contributor_profile_audits_profile_id_contributor_profiles_id_fk"
	}),
	foreignKey({
		columns: [table.actorUserId],
		foreignColumns: [adminUsers.id],
		name: "contributor_profile_audits_actor_user_id_admin_users_id_fk"
	}),
]);

export const buildings = pgTable("buildings", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "buildings_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	buildingName: varchar("building_name", { length: 100 }).notNull(),
	lon: doublePrecision().notNull(),
	lat: doublePrecision().notNull(),
	directions: text().notNull(),
	version: integer().default(1).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	type: buildingType().default('non-admin').notNull(),
	imageUrl: text("image_url"),
	crFacilities: text("cr_facilities").array(),
	streetViewPanoId: varchar("street_view_pano_id", { length: 128 }),
	streetViewCaptured: varchar("street_view_captured", { length: 16 }),
	streetViewDistanceM: integer("street_view_distance_m"),
	streetViewCheckedAt: timestamp("street_view_checked_at", { mode: 'string' }),
}, (table) => [
	index("buildings_street_view_pano_idx").using("btree", table.id.asc().nullsLast().op("int4_ops")).where(sql`(street_view_pano_id IS NOT NULL)`),
]);

export const aliases = pgTable("aliases", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "aliases_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	alias: text().notNull(),
	normalizedAlias: text("normalized_alias").notNull(),
	targetType: varchar("target_type", { length: 16 }).notNull(),
	targetId: integer("target_id").notNull(),
	source: varchar({ length: 32 }),
	confidence: varchar({ length: 16 }).default('unverified').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("aliases_normalized_target").using("btree", table.normalizedAlias.asc().nullsLast().op("text_ops"), table.targetType.asc().nullsLast().op("int4_ops"), table.targetId.asc().nullsLast().op("text_ops")),
]);

export const finalExams = pgTable("final_exams", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "final_exams_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	termId: integer("term_id").notNull(),
	courseCode: varchar("course_code", { length: 16 }).notNull(),
	section: varchar({ length: 16 }),
	courseTitle: text("course_title"),
	roomId: integer("room_id"),
	examDate: date("exam_date").notNull(),
	startsAt: time("starts_at").notNull(),
	endsAt: time("ends_at").notNull(),
	source: varchar({ length: 64 }).notNull(),
	version: integer().default(1).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.roomId],
			foreignColumns: [rooms.id],
			name: "final_exam_room"
		}),
	foreignKey({
			columns: [table.termId],
			foreignColumns: [terms.id],
			name: "final_exam_term"
		}),
]);

export const plannerPlans = pgTable("planner_plans", {
	userId: integer("user_id").primaryKey().notNull(),
	data: jsonb().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [adminUsers.id],
			name: "planner_plans_user_id_admin_users_id_fk"
		}).onDelete("cascade"),
]);

export const contributions = pgTable("contributions", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "contributions_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	userId: integer("user_id"),
	submitterName: varchar("submitter_name", { length: 100 }),
	entityType: varchar("entity_type", { length: 32 }).notNull(),
	entityId: integer("entity_id").notNull(),
	entityLabel: text("entity_label").notNull(),
	source: varchar({ length: 32 }).notNull(),
	proposalId: integer("proposal_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.proposalId],
			foreignColumns: [editProposals.id],
			name: "contributions_proposal_id_edit_proposals_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [adminUsers.id],
			name: "contributions_user_id_admin_users_id_fk"
		}),
]);

export const floraSpecies = pgTable("flora_species", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "flora_species_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	scientificName: text("scientific_name").notNull(),
	family: text(),
	commonNames: text("common_names").array(),
	description: text(),
	imageUrl: text("image_url"),
	conservationStatus: varchar("conservation_status", { length: 32 }),
	isNative: boolean("is_native"),
	version: integer().default(1).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("flora_species_scientific_name_unique").on(table.scientificName),
]);

export const floraSpecimens = pgTable("flora_specimens", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "flora_specimens_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	speciesId: integer("species_id").notNull(),
	lat: doublePrecision().notNull(),
	lon: doublePrecision().notNull(),
	tagNumber: varchar("tag_number", { length: 32 }),
	plantedYear: integer("planted_year"),
	notes: text(),
	isNotable: boolean("is_notable").default(false).notNull(),
	source: varchar({ length: 32 }).default('manual').notNull(),
	sourceRef: text("source_ref"),
	sourceLicence: varchar("source_licence", { length: 64 }),
	version: integer().default(1).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("flora_specimens_notable_idx").using("btree", table.isNotable.asc().nullsLast().op("bool_ops")),
	index("flora_specimens_species_idx").using("btree", table.speciesId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.speciesId],
			foreignColumns: [floraSpecies.id],
			name: "flora_specimens_species_id_fkey"
		}).onDelete("cascade"),
]);

export const terms = pgTable("terms", {
	id: integer().primaryKey().notNull(),
	label: text().notNull(),
	schoolYear: varchar("school_year", { length: 16 }),
	semester: varchar({ length: 12 }),
	startsOn: timestamp("starts_on", { mode: 'string' }),
	endsOn: timestamp("ends_on", { mode: 'string' }),
	isDefault: boolean("is_default").default(false).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	version: integer().default(1).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	classesImportedAt: timestamp("classes_imported_at", { mode: 'string' }),
}, (table) => [
	uniqueIndex("terms_single_default").using("btree", table.isDefault.asc().nullsLast().op("bool_ops")).where(sql`is_default`),
]);

export const announcements = pgTable("announcements", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "announcements_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	title: text().notNull(),
	body: text().notNull(),
	severity: varchar({ length: 16 }).default('info').notNull(),
	startsOn: timestamp("starts_on", { mode: 'string' }).defaultNow().notNull(),
	endsOn: timestamp("ends_on", { mode: 'string' }),
	linkUrl: text("link_url"),
	author: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	version: integer().default(1).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const feedback = pgTable("feedback", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "feedback_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	message: text().notNull(),
	contact: text(),
	screen: text(),
	appVersion: text("app_version"),
	wasOnline: boolean("was_online"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("feedback_created_at_idx").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
]);

export const roomPositions = pgTable("room_positions", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "room_positions_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	floor: integer().notNull(),
	posX: numeric("pos_x").notNull(),
	posY: numeric("pos_y").notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
	roomId: integer("room_id").notNull(),
	source: varchar({ length: 16 }).default('manual').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.roomId],
			foreignColumns: [rooms.id],
			name: "room_position_id"
		}),
]);

export const eventRouteStops = pgTable("event_route_stops", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "event_route_stops_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	routeId: integer("route_id").notNull(),
	eventLocationId: integer("event_location_id"),
	label: text().notNull(),
	lat: doublePrecision(),
	lon: doublePrecision(),
	sortOrder: integer("sort_order").default(0).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.eventLocationId],
			foreignColumns: [eventLocations.id],
			name: "event_route_stop_location"
		}),
	foreignKey({
			columns: [table.routeId],
			foreignColumns: [eventRoutes.id],
			name: "event_route_stop_route"
		}),
]);

export const eventRoutes = pgTable("event_routes", {
	id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "event_routes_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	eventId: integer("event_id").notNull(),
	name: varchar({ length: 120 }).notNull(),
	description: text(),
	sortOrder: integer("sort_order").default(0).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [events.id],
			name: "event_route_event"
		}),
]);

export const editorHistory = pgTable("editor_history", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "editor_history_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	entityType: varchar("entity_type", { length: 32 }).notNull(),
	entityId: integer("entity_id").notNull(),
	action: varchar({ length: 32 }).notNull(),
	beforeSnapshot: jsonb("before_snapshot"),
	afterSnapshot: jsonb("after_snapshot"),
	versionBefore: integer("version_before"),
	versionAfter: integer("version_after"),
	editedBy: varchar("edited_by", { length: 100 }).default('admin').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	summary: text(),
});
