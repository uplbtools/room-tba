-- AY 2026-2027 1st Semester dates from the OUR Approved Academic Calendar
-- 2026-2027 (classes 03 Aug – 27 Nov 2026, finals 01–07 Dec 2026); see
-- data/academic-calendar-2026-2027.json. 1262/1263 rows wait until AMIS
-- publishes their class data. Idempotent: keeps an existing label, only
-- refreshes the dates.
INSERT INTO "terms" ("id", "label", "school_year", "semester", "starts_on", "ends_on", "is_default", "is_active", "sort_order")
VALUES
  (1261, 'AY 2026-2027 1st Semester', '2026-2027', '1', '2026-08-03', '2026-12-07', false, true, 40)
ON CONFLICT ("id") DO UPDATE SET
  "starts_on" = EXCLUDED."starts_on",
  "ends_on" = EXCLUDED."ends_on";
