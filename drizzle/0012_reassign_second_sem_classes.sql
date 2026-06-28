-- Production class rows were imported with CRS term_id 1252 but are AY 2025-2026
-- second-semester schedules. Midyear (1252) stays empty until a midyear AMIS import.
UPDATE "classes"
SET "term_id" = 1253
WHERE "term_id" = 1252;
--> statement-breakpoint
UPDATE "update"
SET "sync_key" = gen_random_uuid()
WHERE "table_name" = 'classes';
