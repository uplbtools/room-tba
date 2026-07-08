import type { APIRoute } from "astro";
import { getAllOrganizations } from "@lib/services/map-data-service";

export const prerender = false;

export const GET = (async (_) => {
  const data = await getAllOrganizations();
  return new Response(JSON.stringify(data));
}) satisfies APIRoute;
