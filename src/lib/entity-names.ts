/** Normalize labels for duplicate detection (spacing/punctuation variants). */
export function normalizeEntityName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_\-./]+/g, "");
}
