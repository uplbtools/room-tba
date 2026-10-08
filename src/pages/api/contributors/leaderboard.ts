import type { APIRoute } from "astro";
import { getContributorLeaderboard } from "@lib/services/contribution-service";
import {
  PUBLIC_LEADERBOARD_CACHE,
  parseLeaderboardQuery,
} from "@lib/contributors/leaderboard-query";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const { window, board, source } = parseLeaderboardQuery(url);
  try {
    const result = await getContributorLeaderboard(window, source);
    return json({ ...result, board }, 200, {
      "Cache-Control": PUBLIC_LEADERBOARD_CACHE,
    });
  } catch (error) {
    console.error("leaderboard query failed:", error);
    return json({ error: "Leaderboard is temporarily unavailable." }, 500);
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
