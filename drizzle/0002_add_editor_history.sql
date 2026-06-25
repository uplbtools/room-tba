CREATE TABLE IF NOT EXISTS "editor_history" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "entity_type" varchar(32) NOT NULL,
  "entity_id" integer NOT NULL,
  "action" varchar(32) NOT NULL,
  "before_snapshot" jsonb,
  "after_snapshot" jsonb,
  "version_before" integer,
  "version_after" integer,
  "edited_by" varchar(100) NOT NULL DEFAULT 'admin',
  "created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "editor_history_entity_idx"
  ON "editor_history" ("entity_type", "entity_id", "created_at");
