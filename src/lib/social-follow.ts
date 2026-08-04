/**
 * One-time "follow the UPLB Tools accounts" suggestion.
 *
 * The whole point of this module is the frequency cap: the app asks once. Both
 * outcomes retire the prompt for good — dismissing it because the reader said
 * no, opening an account because the reader said yes. There is no snooze, no
 * timer, and no second ask, so this is deliberately a one-way switch with no
 * un-retire function.
 *
 * The key is in `PRESERVED_LOCAL_KEYS` (`src/lib/local/clear-cached-data.ts`)
 * alongside `hideLandingModal`: "stop showing me this" is a preference, and
 * clearing a broken bundle's cache must not resurrect it.
 */

export const FOLLOW_PROMPT_KEY = "social-follow-prompt";

/** Views without an answer before the prompt retires itself. */
export const FOLLOW_PROMPT_MAX_VIEWS = 3;

const VIEW_COUNT_KEY = "social-follow-prompt-views";

export type FollowPromptOutcome = "dismissed" | "followed" | "ignored";

/** True once the reader has dismissed or acted on the prompt, on any visit. */
export function isFollowPromptRetired(): boolean {
  try {
    return localStorage.getItem(FOLLOW_PROMPT_KEY) !== null;
  } catch {
    // SSR, or storage blocked. Never treat "cannot read" as "already asked".
    return false;
  }
}

/**
 * Count a render, and retire the prompt once it has been shown
 * FOLLOW_PROMPT_MAX_VIEWS times without an answer.
 *
 * Without this, someone who neither dismisses nor follows, and simply scrolls
 * past, sees it again on every visit forever. For a reader who looks up a room
 * most days that is a nag, which is the one thing this was not allowed to be.
 * Ignoring something three times is an answer.
 *
 * Returns true when this render should still show the prompt.
 */
export function countFollowPromptView(): boolean {
  if (isFollowPromptRetired()) return false;
  try {
    const seen = Number(localStorage.getItem(VIEW_COUNT_KEY) ?? "0") + 1;
    localStorage.setItem(VIEW_COUNT_KEY, String(seen));
    if (seen > FOLLOW_PROMPT_MAX_VIEWS) {
      retireFollowPrompt("ignored");
      return false;
    }
  } catch {
    // Storage blocked: show it rather than treating the failure as an answer.
  }
  return true;
}

/** Retire the prompt permanently. Idempotent. */
export function retireFollowPrompt(outcome: FollowPromptOutcome): void {
  try {
    localStorage.setItem(FOLLOW_PROMPT_KEY, outcome);
  } catch {
    // Private mode / storage full: the dismissal cannot be remembered. Nothing
    // to fall back to, and a silent failure beats blocking the click.
  }
}
