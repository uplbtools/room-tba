-- Instructional dates for AY 2025-2026 (Asia/Manila, date-only).
-- 1251 left undated: Room TBA did not exist during AY 2025-2026 1st sem.
UPDATE "terms"
SET
  "starts_on" = '2026-06-08',
  "ends_on" = '2026-07-26',
  "is_default" = true
WHERE "id" = 1252;
--> statement-breakpoint
UPDATE "terms"
SET
  "starts_on" = '2026-01-19',
  "ends_on" = '2026-05-31'
WHERE "id" = 1253;
