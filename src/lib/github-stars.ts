const GITHUB_STARS_ENDPOINT = "/api/github/stars";

let sharedPromise: Promise<number> | null = null;

export async function fetchGithubStarCount(): Promise<number> {
  const res = await fetch(GITHUB_STARS_ENDPOINT);
  if (!res.ok) {
    throw new Error(`GitHub stars unavailable (${res.status})`);
  }
  const data = (await res.json()) as { stars?: number };
  if (typeof data.stars !== "number" || data.stars < 0) {
    throw new Error("GitHub stars payload invalid");
  }
  return data.stars;
}

/** Dedupes concurrent fetches when multiple star links mount. */
export function fetchGithubStarCountCached() {
  if (!sharedPromise) {
    sharedPromise = fetchGithubStarCount().catch((err) => {
      sharedPromise = null;
      throw err;
    });
  }
  return sharedPromise;
}
