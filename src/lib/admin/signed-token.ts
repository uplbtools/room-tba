import { ADMIN_PASSWORD, ADMIN_SESSION_SECRET } from "astro:env/server";
import {
  createSignedToken as createSignedTokenCore,
  verifySignedToken as verifySignedTokenCore,
} from "./signed-token-core";

function signingSecret(): string {
  if (ADMIN_SESSION_SECRET) return ADMIN_SESSION_SECRET;
  if (ADMIN_PASSWORD) return ADMIN_PASSWORD;
  throw new Error("ADMIN_SESSION_SECRET or ADMIN_PASSWORD must be configured");
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
