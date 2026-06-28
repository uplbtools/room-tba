export type GithubContributor = {
  login: string;
  name: string | null;
  avatarUrl: string;
  profileUrl: string;
  profileHref: string;
  contributions: number;
};

const HIDDEN_LOGINS = new Set([
  "dependabot[bot]",
  "dependabot",
  "github-actions[bot]",
  "renovate[bot]",
  "semantic-release-bot",
  "cursoragent",
  "cursor-agent",
  "copilot-swe-agent[bot]",
  "github-copilot[bot]",
  "devin-ai-integration[bot]",
  "sweep-ai[bot]",
  "allcontributors[bot]",
]);

const HIDDEN_LOGIN_PATTERNS = [
  /\[bot\]$/i,
  /(?:^|[-_])bot$/i,
  /cursor/i,
  /copilot/i,
  /devin/i,
  /sweep/i,
  /renovate/i,
  /dependabot/i,
  /semantic-release/i,
  /allcontributors/i,
  /greenkeeper/i,
  /codecov/i,
];

export function isVisibleGithubContributor(login: string): boolean {
  const key = login.toLowerCase();
  if (HIDDEN_LOGINS.has(key)) return false;
  return !HIDDEN_LOGIN_PATTERNS.some((pattern) => pattern.test(login));
}

export function formatGithubContributions(count: number): string {
  return count === 1 ? "1 commit" : `${count.toLocaleString()} commits`;
}

export async function fetchGithubContributors(): Promise<GithubContributor[]> {
  const res = await fetch("/api/github/contributors");
  if (!res.ok) {
    throw new Error(`GitHub contributors unavailable (${res.status})`);
  }
  const data = (await res.json()) as { contributors?: GithubContributor[] };
  return data.contributors ?? [];
}
