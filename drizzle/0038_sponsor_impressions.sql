CREATE TABLE IF NOT EXISTS sponsor_impressions (
  id            BIGSERIAL PRIMARY KEY,
  sponsor_id    TEXT NOT NULL,
  zone          TEXT NOT NULL,
  event_type    TEXT NOT NULL DEFAULT 'impression',
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent    TEXT,
  page_path     TEXT
);

CREATE INDEX IF NOT EXISTS idx_sponsor_imp_sponsor_date
  ON sponsor_impressions (sponsor_id, recorded_at);

CREATE INDEX IF NOT EXISTS idx_sponsor_imp_zone_date
  ON sponsor_impressions (zone, recorded_at);
