import { query } from "$app/server";
import { db } from "$lib/utils/db";
import { buildingsTable } from "$lib/server/db/schema";

// EntityFetchOptions,
// opt
export const getAllBuildings = query(
    async () => {
        const rows = await db.select().from(buildingsTable);
        return rows;
    }
)

