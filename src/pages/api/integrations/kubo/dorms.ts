import { KUBO_ROOM_TBA_DIRECTORY_URL } from "astro:env/server";
import type { APIRoute } from "astro";
import {
  DEFAULT_KUBO_DIRECTORY_URL,
  fetchKuboDormDirectory,
} from "@lib/server/kubo-dorm-directory";

export const prerender = false;

const CACHE_CONTROL =
  "public, max-age=60, s-maxage=300, stale-while-revalidate=3600";

export const GET: APIRoute = async () => {
  try {
    const { directory, etag } = await fetchKuboDormDirectory(
      KUBO_ROOM_TBA_DIRECTORY_URL || DEFAULT_KUBO_DIRECTORY_URL,
    );
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Cache-Control": CACHE_CONTROL,
    };
    if (etag) headers.ETag = etag;

    return new Response(JSON.stringify(directory), { status: 200, headers });
  } catch (error) {
    console.warn(
      "[kubo-directory] Upstream directory unavailable:",
      error instanceof Error ? error.message : "unknown error",
    );
    return new Response(
      JSON.stringify({ error: "Kubo directory unavailable" }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  }
};
