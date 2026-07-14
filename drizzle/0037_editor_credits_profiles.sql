ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS profile_url text;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS show_in_credits boolean NOT NULL DEFAULT true;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS legacy_credit boolean NOT NULL DEFAULT false;

INSERT INTO admin_users (
  username, display_name, password_hash, role, is_active, avatar_url, show_in_credits, legacy_credit
)
VALUES
  ('legacy-nino-anthony-marmeto', 'Niño Anthony Marmeto', '', 'editor', false, NULL, true, true),
  ('legacy-rosh-almario', 'Rosh Almario', '', 'editor', false, '/contributors/rosh-almario.png', true, true)
ON CONFLICT (username) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  avatar_url = COALESCE(admin_users.avatar_url, EXCLUDED.avatar_url),
  show_in_credits = true,
  legacy_credit = true;
