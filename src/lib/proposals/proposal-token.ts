import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Anonymous proposal ownership (security audit item 9). Each proposal gets a
 * random bearer token at submit; the client keeps it in localStorage next to
 * the proposal ref and the server stores only the SHA-256. Withdrawing,
 * revising, or uploading a photo for an anonymous proposal requires the token,
 * where it used to be enough to type the same display name.
 *
 * Pure (node:crypto only) so bun test loads it.
 */

/** 32 random bytes, base64url: 43 chars, unguessable, URL/JSON safe. */
export function generateProposalToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashProposalToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Constant-time check of a presented token against the stored hash. */
export function proposalTokenMatches(
  token: unknown,
  storedHash: string | null | undefined,
): boolean {
  if (typeof token !== "string" || token.length < 16 || token.length > 128) {
    return false;
  }
  if (storedHash?.length !== 64) return false;
  const presented = Buffer.from(hashProposalToken(token), "hex");
  const expected = Buffer.from(storedHash, "hex");
  return (
    presented.length === expected.length && timingSafeEqual(presented, expected)
  );
}
