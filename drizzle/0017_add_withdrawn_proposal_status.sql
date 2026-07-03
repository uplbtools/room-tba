DO $$ BEGIN
  ALTER TYPE "edit_proposal_status" ADD VALUE 'withdrawn';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
