import type { APIRoute } from "astro";
import {
  PUBLIC_LEADERBOARD_CACHE,
  parseLeaderboardQuery,
} from "@lib/contributors/leaderboard-query";
import { getContributorProfile } from "@lib/services/contribution-service";

export const prerender = false;

/**
 * Public contributor profile by the opaque key a leaderboard row carries.
 * Accounts that turned off "Show me in credits" answer 404, the same as a key
 * that never existed, so the response does not reveal that they contribute.
 */
export const GET: APIRoute = async ({ url }) => {
  const { board, source } = parseLeaderboardQuery(url);
  const key = url.searchParams.get("key")?.trim() ?? "";
  if (!/^[ucn].{1,120}$/s.test(key)) {
    return json({ error: "Contributor not found." }, 404);
  }
  try {
    const profile = await getContributorProfile(key, source);
    if (!profile) return json({ error: "Contributor not found." }, 404);
    return json({ board, profile }, 200, {
      "Cache-Control": PUBLIC_LEADERBOARD_CACHE,
    });
  } catch (error) {
    console.error("contributor profile query failed:", error);
    return json({ error: "Profile is temporarily unavailable." }, 500);
  }
};

function json(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}
