/**
 * Escape a user string for use inside a SQL LIKE pattern.
 *
 * This existed twice, inline and slightly differently: the offline path
 * (`searchLocalRooms`) escaped backslash, the server path (`searchRooms`) did
 * not. So the same query returned different rooms online and offline, and
 * CodeQL flagged the server copy as incomplete sanitization.
 *
 * Backslash must be replaced first. Doing it later re-escapes the backslashes
 * that escaping `%` and `_` just introduced, turning `100%` into a pattern that
 * matches nothing.
 *
 * This is not an injection defence. Both callers pass the result as a bound
 * parameter, so the query is parameterised either way. What it fixes is
 * matching: without it, a user typing `%`, `_` or `\` gets wildcards or a
 * swallowed character instead of a literal search.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}
