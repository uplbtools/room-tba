import type { APIRoute } from "astro";

export const prerender = false;

const GITHUB_REPO = "uplbtools/room-tba";
const CACHE_SECONDS = 60 * 60;

type GithubRepo = {
  stargazers_count?: number;
};

export const GET: APIRoute = async () => {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "room-tba",
      },
    });

    if (!res.ok) {
      return json(
        { error: "Failed to load GitHub stars" },
        res.status === 403 ? 503 : res.status,
      );
    }

    const repo = (await res.json()) as GithubRepo;
    const stars = repo.stargazers_count;
    if (typeof stars !== "number" || stars < 0) {
      return json({ error: "Invalid GitHub stars payload" }, 502);
    }

    return new Response(JSON.stringify({ stars }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${CACHE_SECONDS}, stale-while-revalidate=86400`,
      },
    });
  } catch {
    return json({ error: "Failed to load GitHub stars" }, 503);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
