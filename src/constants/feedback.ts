/** Shared caps for in-app feedback (#881).
 *
 * Lives in constants so the Svelte form can set `maxlength` from the same
 * numbers the server enforces, without pulling `src/lib/api/feedback.ts`
 * (and its rate-limit state) into the client bundle. */
export const FEEDBACK_MESSAGE_MAX = 2000;
export const FEEDBACK_CONTACT_MAX = 120;
