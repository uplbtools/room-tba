import type { APIRoute } from "astro";
import { getAllTerms } from "@lib/services/term-service";

export const prerender = false;

export const GET = (async () => {
  const data = await getAllTerms();
  return new Response(JSON.stringify(data));
}) satisfies APIRoute;
