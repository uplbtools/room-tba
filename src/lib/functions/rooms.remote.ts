import { query } from "$app/server";
import { roomsTable } from "$lib/server/db/schema";
import { db } from "$lib/utils/db";
import { eq } from "drizzle-orm";
import * as v from "valibot";


export const getRoomsByBuildingId = query(
    v.object({
        id: v.pipe(v.number(), v.integer()),
        offset: v.pipe(v.optional(v.number()), v.toNumber(), v.integer(), v.minValue(0))
    }),
    async ({id, offset = 0}) => {
        const rows = await db
            .select()
            .from(roomsTable)
            .where(eq(roomsTable.buildingId, id))
            .orderBy(roomsTable.id)
            .limit(10)
            .offset(offset);
        return rows;
    })