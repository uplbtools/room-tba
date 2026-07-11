-- Second round of directory corrections (idempotent).

-- Not a real establishment/org.
DELETE FROM organizations WHERE name ILIKE 'University Bookstore%';
DELETE FROM places WHERE name ILIKE 'University Bookstore%';

-- Missing colleges.
INSERT INTO colleges (college_name, website_link)
SELECT v.name, v.site FROM (VALUES
  ('College of Public Affairs and Development (CPAf)', 'https://cpaf.uplb.edu.ph'),
  ('School of Environmental Science and Management (SESAM)', 'https://sesam.uplb.edu.ph'),
  ('Graduate School', 'https://gs.uplb.edu.ph')
) AS v(name, site)
WHERE NOT EXISTS (
  SELECT 1 FROM colleges c WHERE c.college_name = v.name
);

INSERT INTO "update" ("table_name")
VALUES ('organizations'), ('places'), ('colleges')
ON CONFLICT ("table_name") DO UPDATE SET "sync_key" = gen_random_uuid();
