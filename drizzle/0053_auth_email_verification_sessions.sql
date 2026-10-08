-- Auth hardening (security audit items 1 and 2).
--
-- email_verified_at: an address only counts once its owner clicked the
-- signed confirmation link. Google sign-in links to an existing account by
-- email, and password-reset / review mail is sent, only for verified rows, so
-- typing someone else's address at signup can no longer pre-claim their
-- account or route their mail.
--
-- Backfill: staff rows (admin/editor) were created by an admin who vouched
-- for the address, and rows linked to Google only ever stored a
-- provider-confirmed email. Self-signup contributors with a typed address
-- stay unverified and can resend the link from Account settings.
--
-- session_version: copied into every signed session cookie and compared on
-- each privileged request. Bumping it (password change or reset, role change,
-- deactivation, "Sign out of all devices") revokes every cookie issued before.
ALTER TABLE "admin_users"
  ADD COLUMN IF NOT EXISTS "email_verified_at" timestamp,
  ADD COLUMN IF NOT EXISTS "session_version" integer DEFAULT 0 NOT NULL;

UPDATE "admin_users"
SET "email_verified_at" = now()
WHERE "email_verified_at" IS NULL
  AND "email" IS NOT NULL
  AND "is_active" = true
  AND ("role" IN ('admin', 'editor') OR "supabase_user_id" IS NOT NULL);
