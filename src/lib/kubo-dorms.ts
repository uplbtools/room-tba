const KUBO_DORM_URLS: Readonly<Record<number, string>> = {
  12: "https://kubo.community/dorms/arable-premier-residences",
  15: "https://kubo.community/dorms/scholar-s-dormitory",
};

/** Return the curated Kubo listing for a Room TBA dorm, when one is verified. */
export function getKuboDormUrl(dormId: number): string | null {
  return KUBO_DORM_URLS[dormId] ?? null;
}
