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
  "final_exams",
  "events",
  "places",
  "event_locations",
  "event_routes",
  "event_route_stops",
];

export const GET = (async ({ params }) => {
  const tableName = params.name as string;
  if (!PATHS.includes(tableName as string))
    return new Response(
      JSON.stringify({
        success: false,
        data: null,
        error: "Invalid table name",
      }),
      { status: 400 },
    );

  let rows: (typeof updateTable.$inferSelect)[];
  try {
    rows = await db
      .select()
      .from(updateTable)
      .where(eq(updateTable.tableName, tableName));
  } catch (error) {
    console.error(`Sync check failed for ${tableName}:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        data: null,
        error:
          "Sync registry unavailable. Apply pending DB migrations (drizzle/0016_ensure_update_sync_table.sql).",
      }),
      { status: 503 },
    );
  }
  if (rows.length === 0 || !rows[0])
    return new Response(
      JSON.stringify({
        success: false,
        data: null,
        error: `Missing sync registry row for ${tableName}. Apply drizzle/0016_ensure_update_sync_table.sql.`,
      }),
      { status: 503 },
    );
  return new Response(
    JSON.stringify({
      success: true,
      error: null,
      data: rows[0],
    }),
  );
}) satisfies APIRoute;
