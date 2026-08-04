-- #873: contributors had no way to talk to a reviewer, so one used the room
-- `directions` content field to send admins a message ("You may opt to remove
-- this room from the app"). Approving that would have published the message as
-- user-facing directions. submitter_note is a reviewer-visible free-text field
-- that is never part of the published patch.
--
-- Distinct from admin_note, which travels the other way (reviewer to
-- contributor on reject / request changes).
ALTER TABLE "edit_proposals" ADD COLUMN IF NOT EXISTS "submitter_note" text;
