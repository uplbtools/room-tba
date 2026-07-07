import { ADMIN_SESSION_SECRET } from "astro:env/server";
import {
  createSignedToken as createSignedTokenCore,
  verifySignedToken as verifySignedTokenCore,
} from "./signed-token-core";

// No ADMIN_PASSWORD fallback — see signingSecret() in ./auth.ts.
function signingSecret(): string {
  if (ADMIN_SESSION_SECRET) return ADMIN_SESSION_SECRET;
  throw new Error("ADMIN_SESSION_SECRET must be configured");
}

export function createSignedToken<T extends Record<string, unknown>>(
  payload: T,
  ttlSeconds: number,
): string {
  return createSignedTokenCore(payload, ttlSeconds, signingSecret());
}

export function verifySignedToken<T>(token: string): T | null {
  return verifySignedTokenCore<T>(token, signingSecret());
}
