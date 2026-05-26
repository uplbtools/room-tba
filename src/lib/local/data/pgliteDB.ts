import { IdbFs, PGlite } from "@electric-sql/pglite";
// import { drizzle } from "drizzle-orm/pglite";
// import * as schema from "../../drizzle/schema";
// import { collegesTable } from "../../drizzle/schema";

export async function getDB() {
  const client = new PGlite({
    fs: new IdbFs("site-data"),
  });
  await client.waitReady;

  // execution if the database isn't created yet
  await client.exec(`
  CREATE TABLE IF NOT EXISTS "buildings" (
  	"id" INTEGER PRIMARY KEY,
  	"building_name" varchar(100) NOT NULL,
  	"lon" numeric NOT NULL,
  	"lat" numeric NOT NULL,
  	"directions" text NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "colleges" (
  	"id" integer PRIMARY KEY,
  	"college_name" varchar(100) NOT NULL
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
  	"lat" numeric,
  	"lon" numeric,
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
  	"division_name" varchar(100) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "rooms" (
  	"id" integer PRIMARY KEY,
  	"room_code" text NOT NULL,
  	"directions" text,
  	"building_id" integer,
  	"college_id" integer,
  	"division_id" integer
  );
  `);

  return client;
}
