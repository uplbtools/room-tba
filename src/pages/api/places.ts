import type { APIRoute } from "astro";
import { getAllPlaces } from "@lib/services/map-data-service";

export const prerender = false;

export const GET = (async (_) => {
  const data = await getAllPlaces();
  return new Response(JSON.stringify(data));
}) satisfies APIRoute;
