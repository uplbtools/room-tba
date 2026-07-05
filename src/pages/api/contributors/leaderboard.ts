import type { APIRoute } from "astro";
import {
  getContributorLeaderboard,
  type LeaderboardWindow,
} from "@lib/services/contribution-service";

export const prerender = false;

const WINDOWS = new Set<LeaderboardWindow>(["month", "semester", "all"]);

export const GET: APIRoute = async ({ url, request }) => {
  const windowParam = url.searchParams.get("window") ?? "month";
  const window = WINDOWS.has(windowParam as LeaderboardWindow)
    ? (windowParam as LeaderboardWindow)
    : "month";

  const auth = request.headers.get("authorization");
  const expected = process.env.ROOM_TBA_BOT_API_KEY;
  if (expected && auth !== `Bearer ${expected}`) {
    return json({ error: "Unauthorized" }, 401);
  }

  const rows = await getContributorLeaderboard(window);
  return json({ window, rows });
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
