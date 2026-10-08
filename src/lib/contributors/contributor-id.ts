/**
 * Stable, anonymous identity for public contributors. A random uuid lives in
 * localStorage and rides along with every proposal, so the leaderboard credits
 * one person under one row whatever name they type. It is never shown; the
 * server only ever publishes a hash of it.
 */

const CONTRIBUTOR_ID_KEY = "room-tba-contributor-id";
const REWARD_SEEN_KEY = "room-tba-contribution-reward-seen";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseContributorId(value: unknown): string | null {
  return typeof value === "string" && UUID_PATTERN.test(value.trim())
    ? value.trim().toLowerCase()
    : null;
}

/** The id this browser already has, without creating one. */
export function readContributorId(): string | null {
  try {
    return parseContributorId(
      globalThis.localStorage?.getItem(CONTRIBUTOR_ID_KEY),
    );
  } catch {
    return null;
  }
}

/** The id for this browser, created on first use. Null when storage is off. */
export function ensureContributorId(): string | null {
  const existing = readContributorId();
  if (existing) return existing;
  try {
    const storage = globalThis.localStorage;
    if (!storage || typeof crypto?.randomUUID !== "function") return null;
    const id = crypto.randomUUID();
    storage.setItem(CONTRIBUTOR_ID_KEY, id);
    // A new contributor has seen no rewards yet: the first approval counts.
    if (storage.getItem(REWARD_SEEN_KEY) === null) {
      storage.setItem(REWARD_SEEN_KEY, "0");
    }
    return id;
  } catch {
    return null;
  }
}

/** Highest ledger id already celebrated, or null before the first check. */
export function readRewardSeen(): number | null {
  try {
    const raw = globalThis.localStorage?.getItem(REWARD_SEEN_KEY);
    if (raw == null) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeRewardSeen(id: number): void {
  try {
    globalThis.localStorage?.setItem(REWARD_SEEN_KEY, String(id));
  } catch {
    // Storage full or blocked: the toast may repeat, nothing else breaks.
  }
}
