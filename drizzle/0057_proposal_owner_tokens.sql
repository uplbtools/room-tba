-- Anonymous proposal ownership (security audit item 9).
--
-- Withdrawing or revising an anonymous suggestion used to be authorized by
-- typing the same display name, which anyone could guess. Each new proposal
-- now gets a random token at submit: the client keeps it in localStorage, the
-- server stores only its SHA-256 here. A side table (not an edit_proposals
-- column) so proposal queries keep working if code deploys before this runs.
-- Proposals from before this migration have no row and can no longer be
-- withdrawn anonymously (signed-in owners are unaffected).
CREATE TABLE IF NOT EXISTS "proposal_owner_tokens" (
	"proposal_id" integer PRIMARY KEY NOT NULL REFERENCES "edit_proposals"("id") ON DELETE CASCADE,
	"token_hash" varchar(64) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
