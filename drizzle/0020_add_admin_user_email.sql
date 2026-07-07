ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "email" text;
CREATE UNIQUE INDEX IF NOT EXISTS "admin_users_email_unique"
  ON "admin_users" (lower("email"))
  WHERE "email" IS NOT NULL;
