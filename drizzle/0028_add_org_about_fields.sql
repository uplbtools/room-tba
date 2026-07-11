-- "About the org" fields sourced from the UPLB OSA directory (via uplb-trail):
-- long biography, OSA org type, year established, and roster size.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS org_type varchar(32),
  ADD COLUMN IF NOT EXISTS established_year varchar(8),
  ADD COLUMN IF NOT EXISTS member_count varchar(16);
