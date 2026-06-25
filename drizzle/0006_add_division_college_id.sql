ALTER TABLE "divisions" ADD COLUMN IF NOT EXISTS "college_id" integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'division_college'
  ) THEN
    ALTER TABLE "divisions"
      ADD CONSTRAINT "division_college"
      FOREIGN KEY ("college_id") REFERENCES "public"."colleges"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

-- Seed parent college from room assignments where unambiguous.
UPDATE "divisions" AS d
SET "college_id" = ranked.college_id
FROM (
  SELECT
    r.division_id,
    r.college_id,
    ROW_NUMBER() OVER (
      PARTITION BY r.division_id
      ORDER BY COUNT(*) DESC, r.college_id
    ) AS rn
  FROM "rooms" AS r
  WHERE r.division_id IS NOT NULL AND r.college_id IS NOT NULL
  GROUP BY r.division_id, r.college_id
) AS ranked
WHERE d.id = ranked.division_id
  AND ranked.rn = 1
  AND d.college_id IS NULL;
