import type { APIRoute } from "astro";
import { optionalEditorSession } from "@lib/admin/require-editor";
import { parseContributorId } from "@lib/contributors/contributor-id";
import { parseLeaderboardQuery } from "@lib/contributors/leaderboard-query";
import { getContributorStanding } from "@lib/services/contribution-service";

export const prerender = false;

/**
 * "Your rank": the signed-in account, else the public contributor id this
 * browser sends. Personal, so never cached by the CDN.
 */
export const GET: APIRoute = async ({ url, cookies }) => {
  const { window, board, source } = parseLeaderboardQuery(url);
  const session = await optionalEditorSession(cookies);
  const userId = session && session.id > 0 ? session.id : null;
  const contributorId = parseContributorId(
    url.searchParams.get("contributorId"),
  );
  if (!userId && !contributorId) {
    return json({ window, board, me: null });
  }
  try {
    const me = await getContributorStanding({
      window,
      source,
      userId,
      contributorId,
    });
    return json({ window, board, me });
  } catch (error) {
    console.error("contributor standing query failed:", error);
    return json({ error: "Your rank is temporarily unavailable." }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
    },
  });
}
