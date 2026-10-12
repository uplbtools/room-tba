import { form, query } from "$app/server";
import { OrgProposalSchema, TableIdSchema } from "$lib/schema/functions";
import { client } from "$lib/server/db";
import { editProposalsTable, organizationsTable } from "$lib/server/db/schema";
import { db } from "$lib/utils/db";
import { error } from "@sveltejs/kit";
import { eq, isNotNull, or } from "drizzle-orm";

export const getMapOrgsData = query(async () => {

    const hasLocationRows = await db
        .select({
            name: organizationsTable.name,
            id: organizationsTable.id,
            lon: organizationsTable.lon,
            lat: organizationsTable.lat,
            category: organizationsTable.category
        })
        .from(organizationsTable)
        .where(or(isNotNull(organizationsTable.lon), isNotNull(organizationsTable.lat)));
    return hasLocationRows;
})

export const getOrgById = query(
    TableIdSchema,
    async (id) => {

        // const rows = await client`
        //     SELECT * FROM organizations
        //     WHERE id = ${id};
        // `

        // console.log(rows[0]);
        // if (rows.length === 0) error(404, "Not found");
        const [entry] = await db
            .select()
            .from(organizationsTable)
            .where(eq(organizationsTable.id, id));

        if (!entry) error(404, "Not found");

        return entry;
    }
)

export const getOrgsByBuildingId = query(
    TableIdSchema,
    async (id) => {
        const rows = await db
            .select()
            .from(organizationsTable)
            .where(eq(organizationsTable.buildingId, id));

        return rows;
    }
)

export const addOrgSuggestion = form(OrgProposalSchema, async ({ meta, body: proposedPatch }) => {
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