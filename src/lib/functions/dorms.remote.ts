import { form, query } from "$app/server";
import { DormProposalSchema, TableIdSchema } from "$lib/schema/functions";
import { dormsTable, editProposalsTable } from "$lib/server/db/schema";
import { db } from "$lib/utils/db";
import { error } from "@sveltejs/kit";
import { eq, isNotNull, or } from "drizzle-orm";


export const getMapDormsData = query(async () => {
    const rows: any[] = [];/* await db.select({
        id: dormsTable.id,
        name: dormsTable.dormName,
        lon: dormsTable.lon,
        lat: dormsTable.lat,
        isUpManaged: dormsTable.isUpManaged
    }).from(dormsTable).where(or(isNotNull(dormsTable.lon), isNotNull(dormsTable.lat)));
 */
    return rows;
})

export const getDormById = query(
    TableIdSchema,
    async (id) => {
        const [entry] = await db
            .select()
            .from(dormsTable)
            .where(eq(dormsTable.id, id));

        if (!entry) error(404, "Not found");

        return entry;
    }
)

export const addDormSuggestion = form(DormProposalSchema, async ({meta, body: proposedPatch}) => {
    try {
        await db
            .insert(editProposalsTable)
            .values({
                entityType: "create_dorm",
                entityId: meta.entityId,
                baseVersion: meta.baseVersion,
                submitterName: meta.submitterName,
                proposedPatch,
            });
    } catch {
        error(500, {
            message: "SERVER ERROR: Cannot add dorms suggestion"
        })
    }
})