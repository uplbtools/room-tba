import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const GITHUB_REPO = 'uplbtools/room-tba';
const CACHE_SECONDS = 60 * 60;

type GithubRepo = {
	stargazers_count?: number;
};

export const GET: RequestHandler = async () => {
	try {
		const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, {
			headers: {
				Accept: 'application/vnd.github+json',
				'User-Agent': 'room-tba'
			}
		});

		if (!res.ok) {
			return json(
				{ error: "Couldn't load GitHub stars" },
				{ status: res.status === 403 ? 503 : res.status }
			);
		}

		const repo = (await res.json()) as GithubRepo;
		const stars = repo.stargazers_count;
		if (typeof stars !== 'number' || stars < 0) {
			return json({ error: 'Invalid GitHub stars payload' }, { status: 502 });
		}

		return json(
			{ stars },
			{
				status: 200,
				headers: {
					'Cache-Control': `public, max-age=${CACHE_SECONDS}, stale-while-revalidate=86400`
				}
			}
		);
	} catch (e) {
		console.error(e);
		return json({ error: "Couldn't load GitHub stars" }, { status: 503 });
	}
};
