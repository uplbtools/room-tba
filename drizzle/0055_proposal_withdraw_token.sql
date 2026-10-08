-- Anonymous proposal ownership (security audit item 9).
--
-- Withdrawing or revising an anonymous suggestion used to be authorized by
-- typing the same display name, which anyone could guess. Each proposal now
-- gets a random token at submit: the client keeps it in localStorage, the
-- server stores only its SHA-256 hash here. Older rows keep NULL and can no
-- longer be withdrawn anonymously (signed-in owners are unaffected).
ALTER TABLE "edit_proposals"
  ADD COLUMN IF NOT EXISTS "withdraw_token_hash" varchar(64);
