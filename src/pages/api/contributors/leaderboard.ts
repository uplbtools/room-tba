import type { APIRoute } from "astro";
import {
  type ContributionSource,
  getContributorLeaderboard,
  type LeaderboardWindow,
} from "@lib/services/contribution-service";

export const prerender = false;

const WINDOWS = new Set<LeaderboardWindow>(["month", "semester", "all"]);

// Two boards, not one ranking: "community" counts approved public submissions,
// "editors" counts what editors published directly.
const BOARDS: Record<string, ContributionSource> = {
  community: "proposal_approved",
  editors: "editor_published",
};

export const GET: APIRoute = async ({ url }) => {
  const windowParam = url.searchParams.get("window") ?? "month";
  const window = WINDOWS.has(windowParam as LeaderboardWindow)
    ? (windowParam as LeaderboardWindow)
    : "month";

  const boardParam = url.searchParams.get("board") ?? "community";
  const board = boardParam in BOARDS ? boardParam : "community";

  try {
    const rows = await getContributorLeaderboard(window, BOARDS[board]);
    return json({ window, board, rows });
  } catch (error) {
    console.error("leaderboard query failed:", error);
    return json({ error: "Leaderboard is temporarily unavailable." }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
