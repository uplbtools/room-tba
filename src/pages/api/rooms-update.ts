import type { APIRoute } from "astro";
import { roomsTable } from "@drizzle/schema";
import { count, isNotNull } from "drizzle-orm";
import { db } from "@lib/db";

export const prerender = false;

export const GET = (async (_) => {
  try {
    const directionRows = await db
      .select({ count: count() })
      .from(roomsTable)
      .where(isNotNull(roomsTable.directions));
    const directionCount = directionRows[0]?.count ?? 0;

    const totalRows = await db.select({ count: count() }).from(roomsTable);
    const totalRooms = totalRows[0]?.count ?? 0;

    return new Response(JSON.stringify({ directionCount, totalRooms }));
  } catch (error) {
    console.error("[rooms-update] count failed:", error);
    return new Response(JSON.stringify({ directionCount: 0, totalRooms: 0 }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}) satisfies APIRoute;
