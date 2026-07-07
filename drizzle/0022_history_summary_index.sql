ALTER TABLE editor_history ADD COLUMN IF NOT EXISTS summary text;

CREATE INDEX IF NOT EXISTS editor_history_entity_idx
  ON editor_history (entity_type, entity_id, created_at DESC);
