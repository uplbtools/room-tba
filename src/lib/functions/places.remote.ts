import { query } from "$app/server";
import { TableId } from "$lib/schema/functions";
import { placesTable } from "$lib/server/db/schema";
import { db } from "$lib/utils/db";
import { error } from "@sveltejs/kit";
import { eq, isNotNull, or } from "drizzle-orm";

export const getMapPlacesData = query(async () => {
    const rows = await db.select({
        id: placesTable.id,
        category: placesTable.category,
        name: placesTable.name,
        lon: placesTable.lon,
        lat: placesTable.lat
    }).from(placesTable).where(or(isNotNull(placesTable.lon), isNotNull(placesTable.lat)));
    return rows;
});

export const getPlaceById = query(
    TableId,
    async (id) => {
        const [entry] = await db
            .select()
            .from(placesTable)
            .where(eq(placesTable.id, id));

        if (!entry) error(404, "Not found");

        return entry;
    }
)