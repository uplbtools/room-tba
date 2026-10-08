import {
  LEADERBOARD_WINDOWS,
  type LeaderboardWindow,
} from "@lib/contributors/scoring";
import type { LeaderboardBoard } from "./leaderboard-types";

export type ContributionSource = "proposal_approved" | "editor_published";

// Two boards, not one ranking: "community" counts approved public submissions,
// "editors" counts what editors published directly.
export const BOARD_SOURCES: Record<LeaderboardBoard, ContributionSource> = {
  community: "proposal_approved",
  editors: "editor_published",
};

/** Query params shared by the leaderboard, standing and profile endpoints. */
export function parseLeaderboardQuery(url: URL): {
  window: LeaderboardWindow;
  board: LeaderboardBoard;
  source: ContributionSource;
} {
  const windowParam = url.searchParams.get("window") ?? "month";
  const window = (LEADERBOARD_WINDOWS as readonly string[]).includes(
    windowParam,
  )
    ? (windowParam as LeaderboardWindow)
    : "month";
  const board: LeaderboardBoard =
    url.searchParams.get("board") === "editors" ? "editors" : "community";
  return { window, board, source: BOARD_SOURCES[board] };
}

/**
 * Public boards change only when an edit is approved, so the CDN may serve a
 * minute-old copy and revalidate in the background. Vercel keys the edge cache
 * by full URL, so each window/board query gets its own entry.
 */
export const PUBLIC_LEADERBOARD_CACHE =
  "public, max-age=0, s-maxage=60, stale-while-revalidate=300";
