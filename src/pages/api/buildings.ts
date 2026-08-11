import type { APIRoute } from "astro";
import { cachedJson } from "@lib/api/json";
import { getAllBuildings } from "@lib/services/map-data-service";

export const prerender = false;

export const GET = (async (_) => {
  const data = await getAllBuildings();
  return cachedJson(data);
}) satisfies APIRoute;
