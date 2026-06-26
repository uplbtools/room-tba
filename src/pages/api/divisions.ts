import { APIRoute } from "astro";
import { getAllDivisions } from "@lib/services/map-data-service";

export const prerender = false;

export const GET = (async (_) => {
  const data = await getAllDivisions();
  return new Response(JSON.stringify(data));
}) satisfies APIRoute;
