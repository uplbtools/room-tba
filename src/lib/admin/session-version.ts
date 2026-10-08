/**
 * Pure session-version comparison (no DB/env imports so bun test loads it).
 * A cookie is current only when it carries exactly the row's version: lower
 * means it was issued before a revocation; higher cannot be minted without the
 * signing secret, so it is treated as tampered.
 */
export function isSessionVersionCurrent(
  cookieVersion: number | undefined,
  rowVersion: number,
): boolean {
  return (cookieVersion ?? 0) === rowVersion;
}
