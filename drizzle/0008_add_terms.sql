CREATE TABLE IF NOT EXISTS "terms" (
  "id" integer PRIMARY KEY,
  "label" text NOT NULL,
  "school_year" varchar(16),
  "semester" varchar(12),
  "starts_on" timestamp,
  "ends_on" timestamp,
  "is_default" boolean NOT NULL DEFAULT false,
  "is_active" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "version" integer NOT NULL DEFAULT 1,
  "updated_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
-- Enforce a single default term for anonymous visitors.
CREATE UNIQUE INDEX IF NOT EXISTS "terms_single_default"
  ON "terms" ("is_default") WHERE "is_default";
--> statement-breakpoint
-- Seed the known UPLB terms. `id` mirrors the CRS/SAIS term_id already stored
-- on classes.term_id (e.g. 1252). Idempotent so re-running is safe.
INSERT INTO "terms" ("id", "label", "school_year", "semester", "starts_on", "ends_on", "is_default", "is_active", "sort_order")
VALUES
  (1251, 'AY 2025-2026 1st Semester', '2025-2026', '1', NULL, NULL, false, true, 10),
  (1252, 'AY 2025-2026 Midyear', '2025-2026', 'midyear', '2026-06-08', '2026-07-26', true, true, 20),
  (1253, 'AY 2025-2026 2nd Semester', '2025-2026', '2', '2026-01-19', '2026-05-31', false, true, 30)
ON CONFLICT ("id") DO NOTHING;
