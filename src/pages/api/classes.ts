import { APIRoute } from "astro";
import { getAllClasses } from "@lib/services/map-data-service";

export const prerender = false;

export const GET = (async (_) => {
  const data = await getAllClasses();
  return new Response(JSON.stringify(data));
}) satisfies APIRoute;
