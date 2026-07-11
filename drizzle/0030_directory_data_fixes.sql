-- Directory corrections that reseeding cannot apply (seed skips existing rows).

-- "University Cafeteria" is not a real establishment.
DELETE FROM places WHERE name = 'University Cafeteria';

-- UPLB Perspective is the official student publication, not a student org.
UPDATE organizations
SET category = 'publication'
WHERE name = 'UPLB Perspective' AND category = 'student-org';

-- The University Student Council is a student council, not a student org.
UPDATE organizations
SET category = 'student-council'
WHERE name ILIKE '%University Student Council%' AND category = 'student-org';

-- Refresh the client sync keys so the corrections propagate to offline caches.
INSERT INTO "update" ("table_name")
VALUES ('places'), ('organizations')
ON CONFLICT ("table_name") DO UPDATE SET "sync_key" = gen_random_uuid();
