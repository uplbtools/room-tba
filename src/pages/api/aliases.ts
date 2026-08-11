import type { APIRoute } from "astro";
import { cachedJson, json } from "@lib/api/json";
import {
  listAliasesForCache,
  searchAliases,
} from "@lib/services/map-data-service";

export const prerender = false;

export const GET = (async ({ url }) => {
  // Full dump feeds PGlite DELETE+INSERT with no sync-key bust. Never edge-cache it.
  if (url.searchParams.get("export") === "all") {
    const data = await listAliasesForCache();
    return json({ data, success: true });
  }

  const q = url.searchParams.get("q") ?? "";
  if (q.trim() === "") {
    return cachedJson({ data: [], success: true });
  }
  const data = await searchAliases(q);
  return cachedJson({ data, success: true });
}) satisfies APIRoute;
