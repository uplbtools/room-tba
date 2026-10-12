import { form } from "$app/server";
import { CollegeProposalSchema } from "$lib/schema/functions";
import { editProposalsTable } from "$lib/server/db/schema";
import { db } from "$lib/utils/db";
import { error } from "@sveltejs/kit";

export const addCollegeSuggestion = form(CollegeProposalSchema, async ({ meta, body: proposedPatch }) => {
    try {
        await db
            .insert(editProposalsTable)
            .values({
                entityType: "create_organization",
                entityId: meta.entityId,
                baseVersion: meta.baseVersion,
                submitterName: meta.submitterName,
                proposedPatch,
            });
    } catch {
        error(500, {
            message: "SERVER ERROR: Cannot add organization suggestion"
        })
    }
})