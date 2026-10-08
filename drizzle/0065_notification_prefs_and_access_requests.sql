-- Per-user email preferences (auth audit item 20). A missing row means the
-- defaults: both on.
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id         INTEGER PRIMARY KEY REFERENCES admin_users(id) ON DELETE CASCADE,
  digest          BOOLEAN NOT NULL DEFAULT true,
  review_notices  BOOLEAN NOT NULL DEFAULT true,
  updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

-- In-app "Request editor access" (auth audit item 15), replacing the
-- Messenger link. One open request per account.
CREATE TABLE IF NOT EXISTS editor_access_requests (
  id           BIGSERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  message      TEXT NOT NULL,
  status       VARCHAR(16) NOT NULL DEFAULT 'pending',
  decided_by   INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  decided_at   TIMESTAMP,
  created_at   TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS editor_access_requests_one_pending
  ON editor_access_requests (user_id)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS editor_access_requests_created_at_idx
  ON editor_access_requests (created_at DESC);
