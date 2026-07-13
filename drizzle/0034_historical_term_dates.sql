-- Instructional dates for AY 2023-2024 and 2024-2025 terms, from the
-- registrar academic-calendar PDFs (data/registrar/, see
-- data/academic-calendar-2024-2025.json; 2023-2024 read by hand from the
-- OCR-only PDF, finals windows cross-checked against the finals-schedule
-- PDFs). Idempotent date refresh only.
UPDATE "terms" SET "starts_on" = '2023-08-29', "ends_on" = '2024-01-11' WHERE "id" = 1231;
--> statement-breakpoint
UPDATE "terms" SET "starts_on" = '2024-02-05', "ends_on" = '2024-06-10' WHERE "id" = 1232;
--> statement-breakpoint
UPDATE "terms" SET "starts_on" = '2024-08-19', "ends_on" = '2024-12-20' WHERE "id" = 1241;
--> statement-breakpoint
UPDATE "terms" SET "starts_on" = '2025-01-27', "ends_on" = '2025-05-31' WHERE "id" = 1242;
--> statement-breakpoint
UPDATE "terms" SET "starts_on" = '2025-06-16', "ends_on" = '2025-07-23' WHERE "id" = 1243;
