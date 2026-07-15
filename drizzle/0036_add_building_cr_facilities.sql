-- Comfort-room facilities per building ("saan may bidet?"): array of slugs
-- from src/constants/cr-facilities.ts. NULL/empty = not yet surveyed.
ALTER TABLE "buildings" ADD COLUMN IF NOT EXISTS "cr_facilities" text[];
