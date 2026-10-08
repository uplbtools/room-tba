/**
 * Have I Been Pwned "Pwned Passwords" check by k-anonymity (auth audit item
 * 16): only the first five hex characters of the SHA-1 leave the server, and
 * the full hash is matched locally against the returned suffixes.
 *
 * Fails open: a timeout or network error must never block sign-up or a
 * password change, so those resolve to "unknown" (null).
 */
import { createHash } from "node:crypto";
import { newPasswordError } from "@lib/auth/contributor-signup";

const RANGE_URL = "https://api.pwnedpasswords.com/range/";
const HIBP_TIMEOUT_MS = 2500;

export const BREACHED_PASSWORD_MESSAGE =
  "This password has appeared in a known data breach, so it is easy to guess. Choose a different one.";

export function sha1Hex(value: string): string {
  return createHash("sha1").update(value, "utf8").digest("hex").toUpperCase();
}

/** Count for `suffix` in a range response body (`SUFFIX:COUNT` lines). */
export function breachCountFromRange(body: string, suffix: string): number {
  const wanted = suffix.toUpperCase();
  for (const line of body.split(/\r?\n/)) {
    const [lineSuffix, count] = line.trim().split(":");
    if (lineSuffix?.toUpperCase() === wanted) {
      const n = Number(count);
      return Number.isFinite(n) ? n : 0;
    }
  }
  return 0;
}

/** Times this password appears in breaches, or null when the check failed. */
export async function pwnedPasswordCount(
  password: string,
  fetchImpl: typeof fetch = fetch,
): Promise<number | null> {
  const hash = sha1Hex(password);
  try {
    const res = await fetchImpl(`${RANGE_URL}${hash.slice(0, 5)}`, {
      headers: { "Add-Padding": "true", "User-Agent": "room-tba" },
      signal: AbortSignal.timeout(HIBP_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return breachCountFromRange(await res.text(), hash.slice(5));
  } catch {
    return null;
  }
}

/**
 * Full server-side check for a new password: length rules, then the breach
 * list. Returns the message to show, or null when the password is fine.
 */
export async function checkNewPassword(
  password: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const invalid = newPasswordError(password);
  if (invalid) return invalid;
  const count = await pwnedPasswordCount(password, fetchImpl);
  return count && count > 0 ? BREACHED_PASSWORD_MESSAGE : null;
}
