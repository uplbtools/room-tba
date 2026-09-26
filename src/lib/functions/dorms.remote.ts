import { query } from "$app/server";
import { dormsTable } from "$lib/server/db/schema";
import { db } from "$lib/utils/db";
import { isNotNull, or } from "drizzle-orm";


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