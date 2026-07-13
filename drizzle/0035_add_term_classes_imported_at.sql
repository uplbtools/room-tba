ALTER TABLE "terms"
ADD COLUMN IF NOT EXISTS "classes_imported_at" timestamp;
