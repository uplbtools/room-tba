/**
 * Curated sponsor config loaded from /sponsors.json (see docs/ad-policy.md).
 * No ad networks, no third-party scripts — images are self-hosted under
 * /sponsors/ and every placement is labeled "Sponsored".
 */

export type SponsorTier =
  | "gold"
  | "silver"
  | "bronze"
  | "promo"
  | "student-org";

export interface Sponsor {
  id: string;
  name: string;
  tier: SponsorTier;
  tagline?: string;
  url: string;
  logo: string;
  banner?: string;
  startDate: string;
  endDate: string;
  active: boolean;
  category: string;
  /** Exact `places.name` of the sponsor's real physical location — grants a
   * labeled "Sponsored" map pin (docs/ad-policy.md: real locations only). */
  placeName?: string;
}

export interface SponsorsConfig {
  maxGold: number;
  maxSilver: number;
  maxBronze: number;
  maxPromo: number;
  rotationIntervalMs: number;
}

export interface SponsorsData {
  sponsors: Sponsor[];
  config: SponsorsConfig;
}

export function getActiveSponsors(
  sponsors: Sponsor[],
  now: Date = new Date(),
): Sponsor[] {
  return sponsors.filter(
    (s) =>
      s.active && new Date(s.startDate) <= now && new Date(s.endDate) >= now,
  );
}

export function getByTier(
  sponsors: Sponsor[],
  tier: SponsorTier,
  now?: Date,
): Sponsor[] {
  return getActiveSponsors(sponsors, now).filter((s) => s.tier === tier);
}

export function getGoldSponsor(
  sponsors: Sponsor[],
  now?: Date,
): Sponsor | null {
  return getByTier(sponsors, "gold", now)[0] ?? null;
}

export function getSilverSponsors(sponsors: Sponsor[], now?: Date): Sponsor[] {
  return getByTier(sponsors, "silver", now);
}

/** Daily rotation: pick one sponsor from a list based on the day of year. */
export function rotateSponsor(
  sponsors: Sponsor[],
  now: Date = new Date(),
): Sponsor | null {
  if (sponsors.length === 0) return null;
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000,
  );
  return sponsors[dayOfYear % sponsors.length] ?? null;
}

/** Ad-policy cap: at most this many sponsored pins on the map at once. */
export const MAX_SPONSORED_PINS = 3;

/**
 * Map of place name → sponsor id for active Gold/Silver sponsors anchored to
 * a real place entity. Capped at MAX_SPONSORED_PINS, gold first.
 */
export function getSponsoredPlacePins(
  sponsors: Sponsor[],
  now?: Date,
): Map<string, string> {
  const pool = [
    ...getByTier(sponsors, "gold", now),
    ...getByTier(sponsors, "silver", now),
  ];
  const pins = new Map<string, string>();
  for (const sponsor of pool) {
    if (!sponsor.placeName) continue;
    if (pins.size >= MAX_SPONSORED_PINS) break;
    if (!pins.has(sponsor.placeName)) pins.set(sponsor.placeName, sponsor.id);
  }
  return pins;
}

/** Client-side loader; resolves null when the config is missing or malformed. */
export async function loadSponsors(): Promise<SponsorsData | null> {
  try {
    const res = await fetch("/sponsors.json");
    if (!res.ok) return null;
    const data = (await res.json()) as SponsorsData;
    if (!Array.isArray(data?.sponsors)) return null;
    return data;
  } catch {
    return null;
  }
}
