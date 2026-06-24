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
    "rooms_fetched" boolean NOT NULL DEFAULT false,
    "version" integer NOT NULL DEFAULT 1,
    "updated_at" timestamp NOT NULL DEFAULT now()
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
   	"room_id" integer,
   	"course_title" text,
   	"term_id" integer
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
    "facebook_link" text,
    "version" integer NOT NULL DEFAULT 1,
    "updated_at" timestamp NOT NULL DEFAULT now()
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
    "classes_fetched" boolean NOT NULL DEFAULT false
    );

    -- DB MIGRATION WHEN TABLE IS OUTDATED

    ALTER TABLE buildings
    ADD COLUMN IF NOT EXISTS "rooms_fetched" boolean NOT NULL DEFAULT false;

    ALTER TABLE buildings
    ADD COLUMN IF NOT EXISTS "type" varchar(12) NOT NULL DEFAULT 'non-admin';

    ALTER TABLE buildings
    ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;

    ALTER TABLE buildings
    ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();

    ALTER TABLE dorms
    ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;

    ALTER TABLE dorms
    ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();

    ALTER TABLE colleges
    ADD COLUMN IF NOT EXISTS "rooms_fetched" boolean NOT NULL DEFAULT false;

    ALTER TABLE divisions
    ADD COLUMN IF NOT EXISTS "rooms_fetched" boolean NOT NULL DEFAULT false;

    ALTER TABLE rooms
    ADD COLUMN IF NOT EXISTS "classes_fetched" boolean NOT NULL DEFAULT false;
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
