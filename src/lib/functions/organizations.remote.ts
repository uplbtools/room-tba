import { query } from "$app/server";
import { TableId } from "$lib/schema/functions";
import { organizationsTable } from "$lib/server/db/schema";
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
    TableId,
    async (id) => {
        const [entry] = await db
            .select()
            .from(organizationsTable)
            .where(eq(organizationsTable.id, id));

        if (!entry) error(404, "Not found");

        return entry;
    }
)