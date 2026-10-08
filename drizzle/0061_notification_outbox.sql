-- Durable queue for Discord/gateway notifications (auth audit item 12).
-- A request enqueues a row, then tries delivery after the response
-- (waitUntil); /api/cron/notification-outbox retries anything still pending
-- with exponential backoff until it is sent or gives up ("dead").
-- Server-only table: never synced to the client PGlite cache.
CREATE TABLE IF NOT EXISTS notification_outbox (
  id               BIGSERIAL PRIMARY KEY,
  event_type       VARCHAR(64) NOT NULL,
  idempotency_key  TEXT NOT NULL,
  event            JSONB NOT NULL,
  status           VARCHAR(16) NOT NULL DEFAULT 'pending',
  attempts         INTEGER NOT NULL DEFAULT 0,
  next_attempt_at  TIMESTAMP NOT NULL DEFAULT now(),
  last_error       TEXT,
  created_at       TIMESTAMP NOT NULL DEFAULT now(),
  sent_at          TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS notification_outbox_idempotency_key_unique
  ON notification_outbox (idempotency_key);

-- The retry sweep reads due pending rows only.
CREATE INDEX IF NOT EXISTS notification_outbox_due_idx
  ON notification_outbox (next_attempt_at)
  WHERE status = 'pending';
