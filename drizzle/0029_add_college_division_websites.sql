-- Official website links for colleges and divisions.
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS website_link text;
ALTER TABLE divisions ADD COLUMN IF NOT EXISTS website_link text;
