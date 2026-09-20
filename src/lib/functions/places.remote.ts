import { query } from "$app/server";
import { placesTable } from "$lib/server/db/schema";
import { db } from "$lib/utils/db";

export const getAllPlaces = query(async() => {
    const rows = await db.select().from(placesTable);
    return rows;
});
