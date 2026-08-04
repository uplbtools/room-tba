-- Probable location for Room TBA sections (#846): AMIS carries a college code
-- (acad_group, e.g. "CAS") and a PeopleSoft department code (acad_org, e.g.
-- "LBICS") on every class row; store them so unassigned sections can be linked
-- to their department. Backfill = rerun import:amis-classes per term JSON.
ALTER TABLE "classes"
ADD COLUMN IF NOT EXISTS "acad_group" varchar(8),
ADD COLUMN IF NOT EXISTS "acad_org" varchar(16);
