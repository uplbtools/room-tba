import type { APIRoute } from "astro";
import { roomsTable } from "@drizzle/schema";
import { count, isNotNull } from "drizzle-orm";
import { db } from "@lib/db";

export const prerender = false;

export const GET = (async (_) => {
  try {
    // @ts-expect-error drizzle returns count as a scalar row here.
    const [{ count: directionCount }] = await db
      .select({ count: count() })
      .from(roomsTable)
      .where(isNotNull(roomsTable.directions));

    // @ts-expect-error drizzle returns count as a scalar row here.
    const [{ count: totalRooms }] = await db
      .select({ count: count() })
      .from(roomsTable);

    return new Response(JSON.stringify({ directionCount, totalRooms }));
  } catch (error) {
    console.error("[rooms-update] count failed:", error);
    return new Response(JSON.stringify({ directionCount: 0, totalRooms: 0 }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}) satisfies APIRoute;
