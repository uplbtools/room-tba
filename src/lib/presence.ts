/**
 * Shared constants + validation for the anonymous presence counter
 * (`/api/presence`, `OnlineCounter.svelte`).
 *
 * Privacy: a presence session id is a random `crypto.randomUUID()` the client
 * keeps in `sessionStorage`. It is never tied to an account and we never log
 * or store IP addresses, user agents, or any analytics alongside it.
 *
 * Kept free of `@lib/db` so the trust-boundary check stays unit-testable in
 * the always-on `bun run test` tier (that tier has no `astro:env/server`).
 */

/** Sessions seen within this window count as online. */
export const ONLINE_WINDOW_SECONDS = 90;

/** Rows past this age are dead weight and get pruned. */
export const PRESENCE_TTL_MINUTES = 10;

/** Fraction of heartbeats that also prune, so no cron job is needed. */
export const PRUNE_SAMPLE_RATE = 0.1;

/** Client UUIDs only: hex and dashes, length-bounded to the `varchar(64)` column. */
const SID_PATTERN = /^[a-zA-Z0-9-]{8,64}$/;

export function isValidSid(sid: unknown): sid is string {
  return typeof sid === "string" && SID_PATTERN.test(sid);
}
