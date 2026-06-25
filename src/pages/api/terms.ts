import { APIRoute } from "astro";
import { getAllTerms } from "../../lib/services/term-service";

export const prerender = false;

export const GET = (async () => {
  const data = await getAllTerms();
  return new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json" },
  });
}) satisfies APIRoute;
