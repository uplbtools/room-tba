-- Leaderboard credit identity, weighting and revert tracking.
--
-- contributor_id: a random uuid the browser keeps in localStorage and sends
-- with every public proposal. Public contributors used to be grouped by the
-- free-text submitter name, which anyone can type and which splits one person
-- across rows when they spell it differently. The uuid is never published; the
-- leaderboard exposes only a hash of it.
ALTER TABLE "edit_proposals"
  ADD COLUMN IF NOT EXISTS "contributor_id" uuid;

ALTER TABLE "contributions"
  ADD COLUMN IF NOT EXISTS "contributor_id" uuid,
  -- place | rooms | photo | position | text. Null on legacy rows, which are
  -- classified at read time from the proposal patch instead.
  ADD COLUMN IF NOT EXISTS "kind" varchar(16),
  -- Set when an editor restores an earlier version over this edit. Reverted
  -- edits stay in the ledger for the audit trail but no longer earn points.
  ADD COLUMN IF NOT EXISTS "reverted_at" timestamptz;

-- Every leaderboard read filters by board (source) and period (created_at).
CREATE INDEX IF NOT EXISTS "contributions_source_created_idx"
  ON "contributions" ("source", "created_at" DESC);

-- The revert path marks edits by entity.
CREATE INDEX IF NOT EXISTS "contributions_entity_idx"
  ON "contributions" ("entity_type", "entity_id");
