import type { APIRoute } from "astro";
import { getAllJeepneyRoutes } from "@lib/services/transit-service";

export const prerender = false;

export const GET = (async () => {
  try {
    return new Response(JSON.stringify(await getAllJeepneyRoutes()), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to load jeepney routes:", error);
    return new Response(JSON.stringify({ error: "Failed to load transit." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}) satisfies APIRoute;
