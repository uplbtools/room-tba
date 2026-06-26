import { APIRoute } from "astro";
import {
  listAliasesForCache,
  searchAliases,
} from "@lib/services/map-data-service";

export const prerender = false;

export const GET = (async ({ url }) => {
  if (url.searchParams.get("export") === "all") {
    const data = await listAliasesForCache();
    return new Response(JSON.stringify({ data, success: true }), {
      headers: { "content-type": "application/json" },
    });
  }

  const q = url.searchParams.get("q") ?? "";
  if (q.trim() === "") {
    return new Response(JSON.stringify({ data: [], success: true }), {
      headers: { "content-type": "application/json" },
    });
  }
  const data = await searchAliases(q);
  return new Response(JSON.stringify({ data, success: true }), {
    headers: { "content-type": "application/json" },
  });
}) satisfies APIRoute;
