-- Staff two-step verification and forced password change (auth audit item
-- 19). Kept in its own table, keyed by user, so admin_users stays untouched.
-- totp_secret_enc is AES-256-GCM ciphertext under TOTP_ENCRYPTION_KEY; the
-- plain secret is never stored. recovery_code_hashes holds SHA-256 hashes.
CREATE TABLE IF NOT EXISTS admin_user_security (
  user_id               INTEGER PRIMARY KEY REFERENCES admin_users(id) ON DELETE CASCADE,
  totp_secret_enc       TEXT,
  totp_enabled_at       TIMESTAMP,
  totp_last_step        BIGINT,
  recovery_code_hashes  JSONB NOT NULL DEFAULT '[]'::jsonb,
  must_change_password  BOOLEAN NOT NULL DEFAULT false,
  mfa_grace_until       TIMESTAMP,
  updated_at            TIMESTAMP NOT NULL DEFAULT now()
);

-- Email invites for new staff, replacing temporary passwords. Only the
-- SHA-256 of the invite token is stored.
CREATE TABLE IF NOT EXISTS staff_invites (
  id                BIGSERIAL PRIMARY KEY,
  email             TEXT NOT NULL,
  display_name      VARCHAR(100),
  role              admin_role NOT NULL,
  token_hash        TEXT NOT NULL,
  invited_by        INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  expires_at        TIMESTAMP NOT NULL,
  accepted_at       TIMESTAMP,
  accepted_user_id  INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS staff_invites_token_hash_unique
  ON staff_invites (token_hash);
