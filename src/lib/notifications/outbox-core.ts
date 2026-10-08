/** Pure retry policy for the notification outbox (no db/env imports). */

/** Give up after this many failed deliveries; the row is marked `dead`. */
export const OUTBOX_MAX_ATTEMPTS = 8;

const BASE_DELAY_MS = 60_000;
const MAX_DELAY_MS = 6 * 60 * 60 * 1000;

/**
 * Delay before the next try after `attempts` failures: 1, 2, 4, 8 minutes
 * and so on, capped at six hours. Eight attempts span roughly four hours,
 * long enough to ride out a gateway deploy or a Heroku dyno restart.
 */
export function outboxRetryDelayMs(attempts: number): number {
  const exponent = Math.max(0, attempts - 1);
  return Math.min(BASE_DELAY_MS * 2 ** exponent, MAX_DELAY_MS);
}

export type OutboxOutcome =
  | { status: "sent" }
  | { status: "pending"; nextAttemptAt: Date }
  | { status: "dead" };

/** What to record after a delivery attempt that made `attempts` total tries. */
export function outboxOutcome(
  ok: boolean,
  attempts: number,
  now = new Date(),
): OutboxOutcome {
  if (ok) return { status: "sent" };
  if (attempts >= OUTBOX_MAX_ATTEMPTS) return { status: "dead" };
  return {
    status: "pending",
    nextAttemptAt: new Date(now.getTime() + outboxRetryDelayMs(attempts)),
  };
}
