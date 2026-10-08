-- Shared rate-limit counters (security audit item 5).
--
-- Serverless instances do not share memory, so the old in-process Map let an
-- attacker spread attempts across instances. One row per bucket key holds a
-- fixed window: the upsert in src/lib/api/rate-limit-db.ts resets the count
-- when the window has passed and increments it otherwise, atomically.
-- `key` is the SHA-256 of the bucket name (which embeds an IP or login), so no
-- address is stored. Server-only table: never synced to the client PGlite cache.
CREATE TABLE IF NOT EXISTS "rate_limits" (
	"key" varchar(200) PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);

-- Lets the cleanup sweep find expired buckets without a full scan.
CREATE INDEX IF NOT EXISTS "rate_limits_reset_at_idx" ON "rate_limits" ("reset_at");
