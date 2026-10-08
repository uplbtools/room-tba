-- Account and review audit trail (auth audit item 18): role changes,
-- activation, account creation, sign-ins, password resets, 2FA changes and
-- proposal decisions. Append-only; rows are never updated or deleted.
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id               BIGSERIAL PRIMARY KEY,
  actor_user_id    INTEGER,
  actor_label      TEXT,
  action           VARCHAR(48) NOT NULL,
  target_user_id   INTEGER,
  target_label     TEXT,
  detail           JSONB,
  ip               TEXT,
  created_at       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_created_at_idx
  ON admin_audit_log (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_target_idx
  ON admin_audit_log (target_user_id, created_at DESC);
