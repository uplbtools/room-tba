import { query } from "$app/server";
import { db } from "$lib/utils/db";
import { buildingsTable } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { error } from "@sveltejs/kit";
import { TableId } from "$lib/schema/functions";

export const getMapBuildingsData = query(
    async () => {
        const rows = await db.select({
            id: buildingsTable.id,
            lon: buildingsTable.lon,
            lat: buildingsTable.lat,
            buildingName: buildingsTable.buildingName,
        }).from(buildingsTable);
        return rows;
    }
)

export const getBuildingById = query(
    TableId,
    async (id) => {
        const [entry] = await db
            .select()
            .from(buildingsTable)
            .where(eq(buildingsTable.id, id));

        if (!entry) error(404, "Not found");
        return entry;
    }
)
