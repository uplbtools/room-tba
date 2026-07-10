-- Client-side PGlite synchronization needs a registry entry for every
-- directory endpoint. These tables were added after the original registry
-- migration, so existing installations need their keys initialized here.
INSERT INTO "update" ("table_name")
VALUES
  ('organizations'),
  ('places')
ON CONFLICT ("table_name") DO UPDATE
SET "sync_key" = gen_random_uuid();
