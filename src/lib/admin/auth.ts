import { createHmac } from "crypto";
import { ADMIN_PASSWORD } from "astro:env/server";

const COOKIE_NAME = "admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  if (!ADMIN_PASSWORD) throw new Error("ADMIN_PASSWORD env var is not set");
  return ADMIN_PASSWORD;
}

/** Produce a deterministic token proving knowledge of the admin password. */
export function makeSessionToken(): string {
  const secret = getSecret();
  return createHmac("sha256", secret)
    .update("admin-session")
    .digest("base64url");
}

/** Verify a cookie value against the expected token. */
export function verifySessionToken(value: string | undefined): boolean {
  if (!value) return false;
  try {
    return value === makeSessionToken();
  } catch {
    return false;
  }
}

export function setSessionCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${COOKIE_MAX_AGE}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
