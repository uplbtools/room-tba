import type { APIRoute } from "astro";
import { cachedJson } from "@lib/api/json";
import { getAllTerms } from "@lib/services/term-service";

export const prerender = false;

export const GET = (async () => {
  const data = await getAllTerms();
  return cachedJson(data);
}) satisfies APIRoute;
