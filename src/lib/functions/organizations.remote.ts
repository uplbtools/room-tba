import { query } from "$app/server";
import { buildingsTable, organizationsTable } from "$lib/server/db/schema";
import { db } from "$lib/utils/db";
import { and, eq, getTableColumns, isNotNull, isNull, or } from "drizzle-orm";

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