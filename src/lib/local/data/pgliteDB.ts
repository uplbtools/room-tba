import { PGlite } from "@electric-sql/pglite";

let localDB: PGlite | null = null;

export async function initPGLiteDB(db: PGlite) {
  try {
    await db.waitReady;

    // execution if the database isn't created yet
    await db.exec(`
    CREATE TABLE IF NOT EXISTS "buildings" (
  	"id" INTEGER PRIMARY KEY,
  	"building_name" varchar(100) NOT NULL,
  	"lon" double precision NOT NULL,
  	"lat" double precision NOT NULL,
  	"directions" text NOT NULL,
  	"type" varchar(12) NOT NULL DEFAULT 'non-admin',
    "rooms_fetched" boolean NOT NULL DEFAULT false
    );

    CREATE TABLE IF NOT EXISTS "colleges" (
   	"id" integer PRIMARY KEY,
   	"college_name" varchar(100) NOT NULL,
    "rooms_fetched" boolean NOT NULL DEFAULT false
    );

    CREATE TABLE IF NOT EXISTS "classes" (
   	"id" integer PRIMARY KEY,
   	"course_code" varchar(16),
   	"section" varchar(16),
   	"type" varchar(12),
   	"schedule" text[],
    "directions" text,
   	"room_id" integer,
   	"course_title" text,
   	"term_id" integer
    );

    CREATE TABLE IF NOT EXISTS "final_exams" (
    "id" integer PRIMARY KEY,
    "term_id" integer NOT NULL,
    "course_code" varchar(16) NOT NULL,
    "section" varchar(16),
    "course_title" text,
    "room_id" integer,
    "exam_date" text NOT NULL,
    "starts_at" text NOT NULL,
    "ends_at" text NOT NULL,
    "source" varchar(64) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "dorms" (
   	"id" integer PRIMARY KEY,
   	"dorm_name" text NOT NULL,
   	"short_name" varchar(48),
   	"lat" double precision NOT NULL,
   	"lon" double precision NOT NULL,
   	"gender" text NOT NULL,
   	"capacity" integer,
   	"managing_office" text,
   	"contact_email" text,
   	"amenities" text[],
   	"osm_link" text,
   	"description" text,
   	"is_up_managed" boolean DEFAULT true,
   	"price_range" text,
   	"contact_phone" varchar(20)[],
   	"facebook_link" text
    );

    CREATE TABLE IF NOT EXISTS "organizations" (
   	"id" integer PRIMARY KEY,
   	"name" text NOT NULL,
   	"category" varchar(24) NOT NULL,
   	"building_id" integer,
   	"room_id" integer,
   	"lat" double precision,
   	"lon" double precision,
   	"description" text,
   	"website_link" text,
   	"facebook_link" text,
   	"email" text,
   	"image_url" text,
    "version" integer NOT NULL DEFAULT 1,
    "updated_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "places" (
   	"id" integer PRIMARY KEY,
   	"name" text NOT NULL,
   	"category" varchar(24) NOT NULL,
   	"lat" double precision,
   	"lon" double precision,
   	"description" text,
   	"hours" text,
   	"website_link" text,
   	"facebook_link" text,
   	"image_url" text,
    "version" integer NOT NULL DEFAULT 1,
    "updated_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "room_positions" (
   	"id" integer PRIMARY KEY,
   	"floor" integer NOT NULL,
   	"pos_x" numeric NOT NULL,
   	"pos_y" numeric NOT NULL,
   	"updated_at" timestamp NOT NULL,
   	"room_id" integer NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "divisions" (
   	"id" integer PRIMARY KEY,
   	"division_name" varchar(100) NOT NULL,
    "rooms_fetched" boolean NOT NULL DEFAULT false
    );

    CREATE TABLE IF NOT EXISTS "rooms" (
   	"id" integer PRIMARY KEY,
   	"room_code" text NOT NULL,
   	"directions" text,
   	"building_id" integer,
   	"college_id" integer,
   	"division_id" integer,
    "category" varchar(24),
    "version" integer NOT NULL DEFAULT 1,
    "updated_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "classes_fetched" boolean NOT NULL DEFAULT false
    );

    CREATE TABLE IF NOT EXISTS "events" (
    "id" integer PRIMARY KEY,
    "slug" varchar(120) NOT NULL,
    "title" varchar(160) NOT NULL,
    "description" text,
    "category" varchar(24) NOT NULL DEFAULT 'other',
    "starts_at" text NOT NULL,
    "ends_at" text NOT NULL,
    "timezone" varchar(64) NOT NULL DEFAULT 'Asia/Manila',
    "recurrence" varchar(32) NOT NULL DEFAULT 'none',
    "is_active" boolean NOT NULL DEFAULT true,
    "source_url" text,
    "image_url" text,
    "priority" integer NOT NULL DEFAULT 0,
    "include_in_seo" boolean NOT NULL DEFAULT false,
    "version" integer NOT NULL DEFAULT 1,
    "updated_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" varchar(16) NOT NULL DEFAULT 'past',
    "occurrence_starts_at" text NOT NULL,
    "occurrence_ends_at" text NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "event_locations" (
    "id" integer PRIMARY KEY,
    "event_id" integer NOT NULL,
    "anchor_type" varchar(16) NOT NULL,
    "building_id" integer,
    "dorm_id" integer,
    "label" text NOT NULL,
    "lat" double precision,
    "lon" double precision,
    "highlight_priority" integer NOT NULL DEFAULT 0,
    "sort_order" integer NOT NULL DEFAULT 0,
    "is_primary" boolean NOT NULL DEFAULT false,
    "updated_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_lat" double precision,
    "resolved_lon" double precision,
    "resolved_label" text NOT NULL,
    "building_name" text,
    "dorm_name" text
    );

    CREATE TABLE IF NOT EXISTS "event_routes" (
    "id" integer PRIMARY KEY,
    "event_id" integer NOT NULL,
    "name" varchar(120) NOT NULL,
    "description" text,
    "sort_order" integer NOT NULL DEFAULT 0,
    "updated_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "event_route_stops" (
    "id" integer PRIMARY KEY,
    "route_id" integer NOT NULL,
    "event_location_id" integer,
    "label" text NOT NULL,
    "lat" double precision,
    "lon" double precision,
    "sort_order" integer NOT NULL DEFAULT 0,
    "updated_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_lat" double precision,
    "resolved_lon" double precision,
    "resolved_label" text NOT NULL
    );

    -- DB MIGRATION WHEN TABLE IS OUTDATED

    ALTER TABLE buildings
    ADD COLUMN IF NOT EXISTS "rooms_fetched" boolean NOT NULL DEFAULT false;

    ALTER TABLE buildings
    ADD COLUMN IF NOT EXISTS "type" varchar(12) NOT NULL DEFAULT 'non-admin';

    ALTER TABLE colleges
    ADD COLUMN IF NOT EXISTS "rooms_fetched" boolean NOT NULL DEFAULT false;

    ALTER TABLE divisions
    ADD COLUMN IF NOT EXISTS "rooms_fetched" boolean NOT NULL DEFAULT false;

    ALTER TABLE rooms
    ADD COLUMN IF NOT EXISTS "classes_fetched" boolean NOT NULL DEFAULT false;

    ALTER TABLE rooms
    ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;

    ALTER TABLE rooms
    ADD COLUMN IF NOT EXISTS "updated_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP;

    ALTER TABLE classes
    ADD COLUMN IF NOT EXISTS "directions" text;

    ALTER TABLE events
    ADD COLUMN IF NOT EXISTS "status" varchar(16) NOT NULL DEFAULT 'past';

    ALTER TABLE events
    ADD COLUMN IF NOT EXISTS "occurrence_starts_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP;

    ALTER TABLE events
    ADD COLUMN IF NOT EXISTS "occurrence_ends_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP;

    ALTER TABLE events
    ADD COLUMN IF NOT EXISTS "image_url" text;

    ALTER TABLE buildings
    ADD COLUMN IF NOT EXISTS "image_url" text;

    ALTER TABLE rooms
    ADD COLUMN IF NOT EXISTS "image_url" text;

    ALTER TABLE rooms
    ADD COLUMN IF NOT EXISTS "category" varchar(24);

    ALTER TABLE dorms
    ADD COLUMN IF NOT EXISTS "image_url" text;

    ALTER TABLE buildings
    ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;

    ALTER TABLE buildings
    ADD COLUMN IF NOT EXISTS "updated_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP;

    ALTER TABLE dorms
    ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;

    ALTER TABLE dorms
    ADD COLUMN IF NOT EXISTS "updated_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP;

    ALTER TABLE colleges
    ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;

    ALTER TABLE colleges
    ADD COLUMN IF NOT EXISTS "updated_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP;

    ALTER TABLE divisions
    ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;

    ALTER TABLE divisions
    ADD COLUMN IF NOT EXISTS "updated_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP;

    ALTER TABLE divisions
    ADD COLUMN IF NOT EXISTS "college_id" integer;

    CREATE TABLE IF NOT EXISTS "aliases" (
    "id" integer PRIMARY KEY,
    "alias" text NOT NULL,
    "normalized_alias" text NOT NULL,
    "target_type" varchar(16) NOT NULL,
    "target_id" integer NOT NULL,
    "building_name" text
    );
    `);
  } catch (e) {
    console.error("An error occurred", e);
  }
}

export function getDB() {
  if (!localDB) {
    localDB = new PGlite("idb://site-data");
  }
  return localDB;
}
