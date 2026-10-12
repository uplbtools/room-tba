import { form, query } from "$app/server";
import { QueryPaginationSchema, RoomProposalSchema } from "$lib/schema/functions";
import { editProposalsTable, roomsTable } from "$lib/server/db/schema";
import { db } from "$lib/utils/db";
import { error } from "@sveltejs/kit";
import { eq } from "drizzle-orm";


export const getRoomsByBuildingId = query(
    QueryPaginationSchema,
    async ({ id, offset = 0 }) => {
        const rows = await db
            .select()
            .from(roomsTable)
            .where(eq(roomsTable.buildingId, id))
            .orderBy(roomsTable.id)
            .limit(10)
            .offset(offset);
        return rows;
    })

export const addRoomSuggestion = form(RoomProposalSchema, async ({ meta, body: proposedPatch }) => {
    try {
        await db
            .insert(editProposalsTable)
            .values({
                entityType: "create_room",
                entityId: meta.entityId,
                baseVersion: meta.baseVersion,
                submitterName: meta.submitterName,
                proposedPatch,
            });
    } catch {
        error(500, {
            message: "SERVER ERROR: Cannot add room suggestion"
        })
    }
})