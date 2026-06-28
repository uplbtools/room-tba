-- Relabel term 1252 to Midyear (CRS term_id matches existing class rows).
UPDATE "terms"
SET
  "label" = 'AY 2025-2026 Midyear',
  "semester" = 'midyear',
  "is_default" = true,
  "sort_order" = 20
WHERE "id" = 1252;
--> statement-breakpoint
INSERT INTO "terms" ("id", "label", "school_year", "semester", "is_default", "is_active", "sort_order")
VALUES
  (1253, 'AY 2025-2026 2nd Semester', '2025-2026', '2', false, true, 30)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
UPDATE "terms" SET "is_default" = false WHERE "id" <> 1252;
--> statement-breakpoint
UPDATE "terms" SET "is_default" = true WHERE "id" = 1252;
