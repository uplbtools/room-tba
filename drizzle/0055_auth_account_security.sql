-- Auth hardening (security audit items 1 and 2): per-account auth state.
--
-- A separate table rather than new admin_users columns, so application code
-- that deploys before this migration runs keeps working (it treats a missing
-- table as "session version 0, nothing verified").
--
-- session_version: copied into every signed session cookie and compared on
-- each request. Bumping it (password change or reset, role change,
-- deactivation, "Sign out of all devices") revokes every cookie issued before.
--
-- verified_email: the address the owner confirmed through the signed link.
-- It only counts while it equals lower(admin_users.email), so changing the
-- email by any path voids it. Google sign-in links to an existing account by
-- email, and reset / review / digest mail is sent, only for verified
-- addresses: typing someone else's email at signup no longer pre-claims their
-- account or routes their mail.
CREATE TABLE IF NOT EXISTS "admin_user_auth" (
	"user_id" integer PRIMARY KEY NOT NULL REFERENCES "admin_users"("id") ON DELETE CASCADE,
	"session_version" integer DEFAULT 0 NOT NULL,
	"verified_email" text,
	"email_verified_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "admin_user_auth_verified_email_idx"
  ON "admin_user_auth" ("verified_email");

-- Backfill: staff rows (admin/editor) were created by an admin who vouched
-- for the address, and Google-linked rows only ever stored a
-- provider-confirmed email. Self-signup contributors with a typed address
-- stay unverified and can resend the link from Account settings.
INSERT INTO "admin_user_auth" ("user_id", "verified_email", "email_verified_at")
SELECT "id", lower("email"), now()
FROM "admin_users"
WHERE "email" IS NOT NULL
  AND "email" <> ''
  AND "is_active" = true
  AND ("role" IN ('admin', 'editor') OR "supabase_user_id" IS NOT NULL)
ON CONFLICT ("user_id") DO NOTHING;
