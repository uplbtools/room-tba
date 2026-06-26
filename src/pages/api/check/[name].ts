import type { APIRoute } from "astro";
import { db } from "@lib/db";
import { updateTable } from "@drizzle/schema";
import { eq } from "drizzle-orm";

export const prerender = false;

const PATHS = [
  "buildings",
  "colleges",
  "divisions",
  "dorms",
  "rooms",
  "classes",
  "events",
  "event_locations",
  "event_routes",
  "event_route_stops",
];

export const GET = (async ({ params }) => {
  const tableName = params["name"] as string;
  if (!PATHS.includes(tableName as string))
    return new Response(
      JSON.stringify({
        success: false,
        data: null,
        error: "Invalid table name",
      }),
      { status: 400 },
    );

  const rows = await db
    .select()
    .from(updateTable)
    .where(eq(updateTable.tableName, tableName));
  if (rows.length === 0 || !rows[0])
    return new Response(
      JSON.stringify({
        success: false,
        data: null,
        error: "Uncaught exception in server",
      }),
      { status: 500 },
    );
  return new Response(
    JSON.stringify({
      success: true,
      error: null,
      data: rows[0],
    }),
  );
}) satisfies APIRoute;
