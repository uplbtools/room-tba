import { query } from "$app/server";
import { dormsTable } from "$lib/server/db/schema";
import { db } from "$lib/utils/db";


export const getAllDorms = query(async() => {
    const rows = await db.select().from(dormsTable);
    return rows;
})