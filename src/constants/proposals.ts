export const MIN_SUBMITTER_NAME_LENGTH = 2;
/** Keep contributor credits short — fits status bar and review queue. */
export const MAX_SUBMITTER_NAME_LENGTH = 32;

/** Contributor's note to the reviewer: a sentence or two, never published. */
export const MAX_SUBMITTER_NOTE_LENGTH = 500;

export function validateSubmitterNote(
  note: string,
): { ok: true; note: string | null } | { ok: false; error: string } {
  const trimmed = note.trim();
  if (trimmed.length === 0) return { ok: true, note: null };
  if (trimmed.length > MAX_SUBMITTER_NOTE_LENGTH) {
    return {
      ok: false,
      error: `Keep the note under ${MAX_SUBMITTER_NOTE_LENGTH} characters.`,
    };
  }
  return { ok: true, note: trimmed };
}

export function validateSubmitterName(
  name: string,
): { ok: true; name: string } | { ok: false; error: string } {
  const trimmed = name.trim();
  if (trimmed.length < MIN_SUBMITTER_NAME_LENGTH) {
    return {
      ok: false,
      error: `Please enter at least ${MIN_SUBMITTER_NAME_LENGTH} characters so we know who to credit.`,
    };
  }
  if (trimmed.length > MAX_SUBMITTER_NAME_LENGTH) {
    return {
      ok: false,
      error: `That name is a bit long. Keep it under ${MAX_SUBMITTER_NAME_LENGTH} characters.`,
    };
  }
  return { ok: true, name: trimmed };
}
