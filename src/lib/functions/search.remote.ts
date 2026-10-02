import { query } from "$app/server";
import { lower } from "$lib/server/db";
import { buildingsTable, collegesTable, divisionsTable, dormsTable, eventsTable, organizationsTable, placesTable, roomsTable } from "$lib/server/db/schema";
import { db } from "$lib/utils/db";
import { escapeLikePattern } from "$lib/utils/like-escape";
import type { EntityType } from "$lib/utils/types";
import { like, sql } from "drizzle-orm";
import { unionAll } from "drizzle-orm/pg-core";
import * as v from "valibot"

export const getUnionSuggestions = query(
    v.pipe(v.string(), v.toLowerCase(), v.trim()),
    async (query) => {
        // buildings
        query = escapeLikePattern(query);
        const buildings = db
            .select({
                name: buildingsTable.buildingName,
                id: buildingsTable.id,
                type: sql<EntityType>`'building'`
            })
            .from(buildingsTable)
            .where(like(lower(buildingsTable.buildingName), `%${query}%`)).limit(3)
        const colleges = db
            .select({
                name: collegesTable.collegeName,
                id: collegesTable.id,
                type: sql<EntityType>`'college'`
            })
            .from(collegesTable)
            .where(like(lower(collegesTable.collegeName), `%${query}%`)).limit(3)
        const divisions = db
            .select({
                name: divisionsTable.divisionName,
                id: divisionsTable.id,
                type: sql<EntityType>`'division'`
            })
            .from(divisionsTable)
            .where(like(lower(divisionsTable.divisionName), `%${query}%`)).limit(3)
        const dorms = db
            .select({
                name: dormsTable.dormName,
                id: dormsTable.id,
                type: sql<EntityType>`'dorm'`
            })
            .from(dormsTable)
            .where(like(lower(dormsTable.dormName), `%${query}%`)).limit(3)
        const events = db
            .select({
                name: eventsTable.title,
                id: eventsTable.id,
                type: sql<EntityType>`'event'`
            })
            .from(eventsTable)
            .where(like(lower(eventsTable.title), `%${query}%`)).limit(3)
        const orgs = db
            .select({
                name: organizationsTable.name,
                id: organizationsTable.id,
                type: sql<EntityType>`'organization'`
            })
            .from(organizationsTable)
            .where(like(lower(organizationsTable.name), `%${query}%`)).limit(3)
        const places = db
            .select({
                name: placesTable.name,
                id: placesTable.id,
                type: sql<EntityType>`'place'`
            })
            .from(placesTable)
            .where(like(lower(placesTable.name), `%${query}%`)).limit(3)
        const rooms = db
            .select({
                name: roomsTable.code,
                id: roomsTable.id,
                type: sql<EntityType>`'room'`
            })
            .from(roomsTable)
            .where(like(lower(roomsTable.code), `%${query}%`)).limit(3);

        

        console.time('union select');
        const results = await unionAll(buildings, colleges, divisions, dorms, events, orgs, places, rooms);

        console.timeEnd('union select')

        return results;
    }
)
