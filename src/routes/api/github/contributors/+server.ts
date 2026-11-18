import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const GITHUB_REPO = 'uplbtools/room-tba';
const CACHE_SECONDS = 60 * 60;

// Inlined from astro/src/constants/contributors.ts
/** Optional display overrides keyed by GitHub login. */
const githubProfileOverrides: Record<string, { name?: string; href?: string }> = {
	smmariquit: {
		name: 'Simonee Ezekiel Mariquit',
		href: 'https://stimmie.dev'
	},
	Kenramiscal1106: {
		name: 'Ken Daniele Ramiscal',
		href: 'https://kendan.dev'
	},
	klnwlks: {
		name: 'Kalinaw Lukas Aom Bebis',
		href: 'https://lukasbebis.com'
	}
};

// Inlined from astro/src/lib/github-contributors.ts
const HIDDEN_LOGINS = new Set([
	'dependabot[bot]',
	'dependabot',
	'github-actions[bot]',
	'renovate[bot]',
	'semantic-release-bot',
	'cursoragent',
	'cursor-agent',
	'copilot-swe-agent[bot]',
	'github-copilot[bot]',
	'devin-ai-integration[bot]',
	'sweep-ai[bot]',
	'allcontributors[bot]'
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
	/codecov/i
];

function isVisibleGithubContributor(login: string): boolean {
	const key = login.toLowerCase();
	if (HIDDEN_LOGINS.has(key)) return false;
	return !HIDDEN_LOGIN_PATTERNS.some((pattern) => pattern.test(login));
}

type GithubContributor = {
	login: string;
	name: string | null;
	avatarUrl: string;
	profileUrl: string;
	profileHref: string;
	contributions: number;
};

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

async function loadGithubProfiles(
	logins: string[]
): Promise<Map<string, { name: string | null; blog: string | null }>> {
	const profiles = new Map<string, { name: string | null; blog: string | null }>();

	await Promise.all(
		logins.map(async (login) => {
			if (githubProfileOverrides[login]?.name) {
				profiles.set(login, {
					name: githubProfileOverrides[login].name ?? null,
					blog: null
				});
				return;
			}

			try {
				const res = await fetch(`https://api.github.com/users/${login}`, {
					headers: {
						Accept: 'application/vnd.github+json',
						'User-Agent': 'room-tba'
					}
				});
				if (!res.ok) return;
				const user = (await res.json()) as GithubUserProfile;
				profiles.set(login, {
					name: user.name?.trim() || null,
					blog: user.blog?.trim() || null
				});
			} catch {
				/* ignore per-user lookup failures */
			}
		})
	);

	return profiles;
}

function normalizeWebsite(blog?: string | null): string | undefined {
	if (!blog) return undefined;
	if (/^https?:\/\//i.test(blog)) return blog;
	return `https://${blog}`;
}

export const GET: RequestHandler = async () => {
	try {
		const res = await fetch(
			`https://api.github.com/repos/${GITHUB_REPO}/contributors?per_page=100`,
			{
				headers: {
					Accept: 'application/vnd.github+json',
					'User-Agent': 'room-tba'
				}
			}
		);

		if (!res.ok) {
			return json(
				{ error: "Couldn't load GitHub contributors" },
				{ status: res.status === 403 ? 503 : res.status }
			);
		}

		const rows = (await res.json()) as GithubApiContributor[];
		const visible = rows.filter(
			(row) => row.type === 'User' && isVisibleGithubContributor(row.login)
		);

		const profiles = await loadGithubProfiles(visible.map((row) => row.login));

		const contributors: GithubContributor[] = visible
			.map((row) => {
				const override = githubProfileOverrides[row.login];
				const profile = profiles.get(row.login);
				const name = override?.name ?? profile?.name ?? null;
				const profileHref = override?.href ?? normalizeWebsite(profile?.blog) ?? row.html_url;

				return {
					login: row.login,
					name,
					avatarUrl: row.avatar_url,
					profileUrl: row.html_url,
					profileHref,
					contributions: row.contributions
				};
			})
			.sort((a, b) => b.contributions - a.contributions);

		return json(
			{ contributors },
			{
				status: 200,
				headers: {
					'Cache-Control': `public, max-age=${CACHE_SECONDS}, stale-while-revalidate=86400`
				}
			}
		);
	} catch (e) {
		console.error(e);
		return json({ error: "Couldn't load GitHub contributors" }, { status: 503 });
	}
};
