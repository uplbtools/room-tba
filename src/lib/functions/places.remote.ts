import { query } from "$app/server";
import { dormsTable, placesTable } from "$lib/server/db/schema";
import { db } from "$lib/utils/db";
import { isNotNull, or } from "drizzle-orm";

export const getMapPlacesData = query(async() => {
    const rows = await db.select({
        id: placesTable.id,
        category: placesTable.category,
        name: placesTable.name,
        lon: placesTable.lon,
        lat: placesTable.lat
    }).from(placesTable)/* .where(or(isNotNull(placesTable.lon), isNotNull(placesTable.lat))) */;
    return rows;
});
