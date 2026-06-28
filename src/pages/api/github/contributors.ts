import type { APIRoute } from "astro";
import { githubProfileOverrides } from "@constants/contributors";
import {
  isVisibleGithubContributor,
  type GithubContributor,
} from "@lib/github-contributors";

export const prerender = false;

const GITHUB_REPO = "smmariquit/room-tba";
const CACHE_SECONDS = 60 * 60;

type GithubApiContributor = {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
  type: string;
};

type GithubUserProfile = {
  name?: string | null;
  blog?: string | null;
};

export const GET: APIRoute = async () => {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contributors?per_page=100`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "room-tba",
        },
      },
    );

    if (!res.ok) {
      return json(
        { error: "Failed to load GitHub contributors" },
        res.status === 403 ? 503 : res.status,
      );
    }

    const rows = (await res.json()) as GithubApiContributor[];
    const visible = rows.filter(
      (row) => row.type === "User" && isVisibleGithubContributor(row.login),
    );

    const profiles = await loadGithubProfiles(visible.map((row) => row.login));

    const contributors: GithubContributor[] = visible
      .map((row) => {
        const override = githubProfileOverrides[row.login];
        const profile = profiles.get(row.login);
        const name = override?.name ?? profile?.name ?? null;
        const profileHref =
          override?.href ?? normalizeWebsite(profile?.blog) ?? row.html_url;

        return {
          login: row.login,
          name,
          avatarUrl: row.avatar_url,
          profileUrl: row.html_url,
          profileHref,
          contributions: row.contributions,
        };
      })
      .sort((a, b) => b.contributions - a.contributions);

    return new Response(JSON.stringify({ contributors }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${CACHE_SECONDS}, stale-while-revalidate=86400`,
      },
    });
  } catch {
    return json({ error: "Failed to load GitHub contributors" }, 503);
  }
};

async function loadGithubProfiles(
  logins: string[],
): Promise<Map<string, { name: string | null; blog: string | null }>> {
  const profiles = new Map<
    string,
    { name: string | null; blog: string | null }
  >();

  await Promise.all(
    logins.map(async (login) => {
      if (githubProfileOverrides[login]?.name) {
        profiles.set(login, {
          name: githubProfileOverrides[login].name ?? null,
          blog: null,
        });
        return;
      }

      try {
        const res = await fetch(`https://api.github.com/users/${login}`, {
          headers: {
            Accept: "application/vnd.github+json",
            "User-Agent": "room-tba",
          },
        });
        if (!res.ok) return;
        const user = (await res.json()) as GithubUserProfile;
        profiles.set(login, {
          name: user.name?.trim() || null,
          blog: user.blog?.trim() || null,
        });
      } catch {
        /* ignore per-user lookup failures */
      }
    }),
  );

  return profiles;
}

function normalizeWebsite(blog?: string | null): string | undefined {
  if (!blog) return undefined;
  if (/^https?:\/\//i.test(blog)) return blog;
  return `https://${blog}`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
