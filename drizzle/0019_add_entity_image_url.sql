ALTER TABLE "buildings" ADD COLUMN IF NOT EXISTS "image_url" text;
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "image_url" text;
ALTER TABLE "dorms" ADD COLUMN IF NOT EXISTS "image_url" text;
