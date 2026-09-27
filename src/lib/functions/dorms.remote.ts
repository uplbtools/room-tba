import { query } from "$app/server";
import { TableId } from "$lib/schema/functions";
import { dormsTable } from "$lib/server/db/schema";
import { db } from "$lib/utils/db";
import { error } from "@sveltejs/kit";
import { eq, isNotNull, or } from "drizzle-orm";


export const getMapDormsData = query(async() => {
    const rows = await db.select({
        id: dormsTable.id,
        name: dormsTable.dormName,
        lon: dormsTable.lon,
        lat: dormsTable.lat,
        isUpManaged: dormsTable.isUpManaged
    }).from(dormsTable).where(or(isNotNull(dormsTable.lon), isNotNull(dormsTable.lat)));
    return rows;
})

export const getDormById = query(
    TableId, 
    async (id) => {
        const [entry] = await db
            .select()
            .from(dormsTable)
            .where(eq(dormsTable.id, id));

        if (!entry) error(404, "Not found");

        return entry;
    }
)