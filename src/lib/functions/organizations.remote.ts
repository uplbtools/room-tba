import { query } from "$app/server";
import { buildingsTable, organizationsTable } from "$lib/server/db/schema";
import { db } from "$lib/utils/db";
import { and, eq, getTableColumns, isNotNull, isNull, or } from "drizzle-orm";

export const getAllOrganizations = query(async () => {

    const noLocationRows = await db
        .select({...getTableColumns(organizationsTable), lon: buildingsTable.lon, lat: buildingsTable.lat})
        .from(organizationsTable)
        .leftJoin(buildingsTable, eq(buildingsTable.id, organizationsTable.buildingId))
        .where(and(isNull(organizationsTable.lon), isNull(organizationsTable.lat)));
    const hasLocationRows = await db
        .select()
        .from(organizationsTable)
        .where(or(isNotNull(organizationsTable.lon), isNotNull(organizationsTable.lat)));
    return [...hasLocationRows, ...noLocationRows];
})