import type { APIRoute } from "astro";
import {
  getContributorLeaderboard,
  type LeaderboardWindow,
} from "@lib/services/contribution-service";

export const prerender = false;

const WINDOWS = new Set<LeaderboardWindow>(["month", "semester", "all"]);

export const GET: APIRoute = async ({ url }) => {
  const windowParam = url.searchParams.get("window") ?? "month";
  const window = WINDOWS.has(windowParam as LeaderboardWindow)
    ? (windowParam as LeaderboardWindow)
    : "month";

  try {
    const rows = await getContributorLeaderboard(window);
    return json({ window, rows });
  } catch (error) {
    console.error("leaderboard query failed:", error);
    return json(
      { error: "Leaderboard is temporarily unavailable." },
      500,
    );
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
