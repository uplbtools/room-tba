-- CRS/AMIS term_id values are chronological within the AY (1251 1st, 1252 2nd, 1253 midyear).
-- Supersedes wrong labels/dates from 0009/0010 and the class move in 0012 (do not re-run 0012).
UPDATE "terms"
SET
  "label" = 'AY 2025-2026 2nd Semester',
  "semester" = '2',
  "starts_on" = '2026-01-19',
  "ends_on" = '2026-05-31',
  "sort_order" = 20,
  "is_default" = false
WHERE "id" = 1252;
--> statement-breakpoint
UPDATE "terms"
SET
  "label" = 'AY 2025-2026 Midyear',
  "semester" = 'midyear',
  "starts_on" = '2026-06-08',
  "ends_on" = '2026-07-26',
  "sort_order" = 30,
  "is_default" = true
WHERE "id" = 1253;
