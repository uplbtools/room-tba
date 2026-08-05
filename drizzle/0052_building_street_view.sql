-- Cache the Street View *metadata* per building, never the imagery.
--
-- Google's terms permit only limited temporary caching of their images, so the
-- pixels stay remote and render live. What is cached here is the answer to
-- "is there a panorama near this building, which one, and when was it shot",
-- which is data we are free to store and which changes about once a year.
--
-- Without this, every building panel view costs a metadata round trip. The
-- endpoint is free and unmetered, so this buys latency rather than money.
--
-- checked_at is what makes the cache refreshable: a null pano id means either
-- "no coverage" or "never looked", and only the timestamp tells them apart.
ALTER TABLE "buildings"
  ADD COLUMN IF NOT EXISTS "street_view_pano_id" varchar(128),
  ADD COLUMN IF NOT EXISTS "street_view_captured" varchar(16),
  ADD COLUMN IF NOT EXISTS "street_view_distance_m" integer,
  ADD COLUMN IF NOT EXISTS "street_view_checked_at" timestamp;

-- Partial index: the panel only ever asks for buildings that have coverage.
CREATE INDEX IF NOT EXISTS "buildings_street_view_pano_idx"
  ON "buildings" ("id")
  WHERE "street_view_pano_id" IS NOT NULL;
