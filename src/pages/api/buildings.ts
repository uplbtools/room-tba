import { APIRoute } from "astro";
import { getAllBuildings } from "../../lib/services/map-data-service";

export const prerender = false;

export const GET = (async (_) => {
  const data = await getAllBuildings();
  return new Response(JSON.stringify(data));
}) satisfies APIRoute;
