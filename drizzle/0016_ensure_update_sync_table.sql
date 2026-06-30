-- Sync-key registry for /api/check/* and client cache invalidation.
-- Legacy DBs had this table from pre-Drizzle setup; it was never created by 0000+ migrations.
CREATE TABLE IF NOT EXISTS "update" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (
    sequence name "update_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1
  ),
  "table_name" varchar(20),
  "sync_key" uuid DEFAULT gen_random_uuid()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "update_table_name_key" ON "update" ("table_name");
--> statement-breakpoint
INSERT INTO "update" ("table_name")
VALUES
  ('buildings'),
  ('colleges'),
  ('divisions'),
  ('dorms'),
  ('rooms'),
  ('room_positions'),
  ('classes'),
  ('events'),
  ('event_locations'),
  ('event_routes'),
  ('event_route_stops'),
  ('final_exams')
ON CONFLICT ("table_name") DO NOTHING;
