import type { APIRoute } from "astro";
import { getAllDorms } from "@lib/services/map-data-service";

export const prerender = false;

export const GET = (async (_) => {
  console.log(import.meta.dirname);
  const data = await getAllDorms();
  return new Response(JSON.stringify(data));
}) satisfies APIRoute;
