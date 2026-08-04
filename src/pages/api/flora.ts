import type { APIRoute } from "astro";
import { getAllFloraSpecimens } from "@lib/services/map-data-service";

export const prerender = false;

/**
 * Public flora read. `?notable=1` restricts to the notable specimens the phase 1
 * map layer draws.
 *
 * Cached at the edge deliberately: flora changes on the order of days, and the
 * Vercel cost review found no public read route setting `s-maxage`, so every
 * request was reaching a function. `stale-while-revalidate` keeps it serving
 * during the revalidate rather than stalling the map.
 */
export const GET = (async ({ url }) => {
  const notableOnly = url.searchParams.get("notable") === "1";

  try {
    const data = await getAllFloraSpecimens(notableOnly);
    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("flora query failed:", error);
    return new Response(
      JSON.stringify({ error: "Flora data is temporarily unavailable." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}) satisfies APIRoute;
