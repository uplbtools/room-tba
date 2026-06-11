import { APIRoute } from "astro";
import { roomsTable } from "../../../drizzle/schema";
import { count, isNotNull } from "drizzle-orm";
import { db } from "../../lib/db";

export const GET = (async (_) => {
  // @ts-ignore drizzle returns count as a scalar row here.
  const [{ count: directionCount }] = await db
    .select({ count: count() })
    .from(roomsTable)
    .where(isNotNull(roomsTable.directions));

  // @ts-ignore drizzle returns count as a scalar row here.
  const [{ count: totalRooms }] = await db
    .select({ count: count() })
    .from(roomsTable);

  return new Response(JSON.stringify({ directionCount, totalRooms }));
}) satisfies APIRoute;
