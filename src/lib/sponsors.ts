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
