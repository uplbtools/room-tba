export const MIN_SUBMITTER_NAME_LENGTH = 2;
/** Keep contributor credits short — fits status bar and review queue. */
export const MAX_SUBMITTER_NAME_LENGTH = 32;

export function validateSubmitterName(
  name: string,
): { ok: true; name: string } | { ok: false; error: string } {
  const trimmed = name.trim();
  if (trimmed.length < MIN_SUBMITTER_NAME_LENGTH) {
    return {
      ok: false,
      error: `Your name must be at least ${MIN_SUBMITTER_NAME_LENGTH} characters.`,
    };
  }
  if (trimmed.length > MAX_SUBMITTER_NAME_LENGTH) {
    return {
      ok: false,
      error: `Your name must be at most ${MAX_SUBMITTER_NAME_LENGTH} characters.`,
    };
  }
  return { ok: true, name: trimmed };
}
