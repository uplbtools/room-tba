-- Outbound email record (auth audit item 13): one row per send attempt so
-- failures are visible to staff instead of vanishing into function logs.
CREATE TABLE IF NOT EXISTS email_log (
  id               BIGSERIAL PRIMARY KEY,
  to_address       TEXT NOT NULL,
  template         VARCHAR(48) NOT NULL,
  status           VARCHAR(16) NOT NULL,
  provider_id      TEXT,
  error            TEXT,
  idempotency_key  TEXT,
  created_at       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_log_created_at_idx
  ON email_log (created_at DESC);
CREATE INDEX IF NOT EXISTS email_log_status_idx
  ON email_log (status, created_at DESC);

-- One row per scheduled job per period, so a retried or doubled cron
-- invocation (Vercel can deliver more than once) skips work already done.
CREATE TABLE IF NOT EXISTS cron_runs (
  job          VARCHAR(64) NOT NULL,
  period       VARCHAR(32) NOT NULL,
  status       VARCHAR(16) NOT NULL DEFAULT 'running',
  detail       JSONB,
  started_at   TIMESTAMP NOT NULL DEFAULT now(),
  finished_at  TIMESTAMP,
  PRIMARY KEY (job, period)
);
