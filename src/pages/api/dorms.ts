import { APIRoute } from "astro";
import { getAllDorms } from "../../lib/services/map-data-service";

export const prerender = false;

export const GET = (async (_) => {
  const data = await getAllDorms();
  return new Response(JSON.stringify(data));
}) satisfies APIRoute;
