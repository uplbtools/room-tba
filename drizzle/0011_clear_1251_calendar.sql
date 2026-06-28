-- Room TBA did not run during AY 2025-2026 1st semester; drop placeholder dates.
UPDATE "terms"
SET
  "starts_on" = NULL,
  "ends_on" = NULL
WHERE "id" = 1251;
