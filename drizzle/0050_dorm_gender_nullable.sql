-- dorms.gender was NOT NULL, which forced a guess whenever the policy is not
-- known. A private residence being reclassified from a building, or a
-- crowdsourced submission from someone who only knows where a dorm is, both had
-- to invent 'male' / 'female' / 'coed' to be storable.
--
-- Unknown and co-ed are different claims. Recording a guess as fact is worse
-- than recording nothing, so the column becomes nullable and the UI stops
-- asserting a policy it was never told.
ALTER TABLE "dorms" ALTER COLUMN "gender" DROP NOT NULL;
