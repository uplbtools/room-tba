import { createHmac, timingSafeEqual } from "crypto";
import { ADMIN_PASSWORD, ADMIN_SESSION_SECRET } from "astro:env/server";

const COOKIE_NAME = "admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type AdminRole = "admin" | "editor" | "contributor";

export type SessionUser = {
  id: number;
  username: string;
  displayName: string;
  role: AdminRole;
};

type SessionPayload = SessionUser & { exp: number };

export function canPublishDirectly(role: AdminRole): boolean {
  return role === "admin" || role === "editor";
}

export function canReviewProposals(role: AdminRole): boolean {
  return role === "admin" || role === "editor";
}

function signingSecret(): string {
  if (ADMIN_SESSION_SECRET) return ADMIN_SESSION_SECRET;
  if (ADMIN_PASSWORD) return ADMIN_PASSWORD;
  throw new Error("ADMIN_SESSION_SECRET or ADMIN_PASSWORD must be configured");
}

function legacySecret(): string | null {
  if (!ADMIN_PASSWORD) return null;
  return ADMIN_PASSWORD;
}

function signBody(body: string): string {
  return createHmac("sha256", signingSecret()).update(body).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

/** Per-user signed session token (v2). */
export function createSessionToken(user: SessionUser): string {
  const payload: SessionPayload = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${signBody(body)}`;
}

export function getSessionUser(
  cookieValue: string | undefined,
): SessionUser | null {
  if (!cookieValue?.includes(".")) return null;
  const dot = cookieValue.lastIndexOf(".");
  if (dot <= 0) return null;

  const body = cookieValue.slice(0, dot);
  const sig = cookieValue.slice(dot + 1);
  if (!body || !sig) return null;

  try {
    if (!safeEqual(signBody(body), sig)) return null;
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (
      !payload ||
      typeof payload.exp !== "number" ||
      payload.exp <= Math.floor(Date.now() / 1000) ||
      !Number.isInteger(payload.id) ||
      typeof payload.username !== "string"
    ) {
      return null;
    }
    return {
      id: payload.id,
      username: payload.username,
      displayName: payload.displayName ?? payload.username,
      role:
        payload.role === "admin" ||
        payload.role === "editor" ||
        payload.role === "contributor"
          ? payload.role
          : "contributor",
    };
  } catch {
    return null;
  }
}

/** Legacy shared-password session token (v1). */
export function makeSessionToken(): string {
  const secret = legacySecret();
  if (!secret) throw new Error("ADMIN_PASSWORD env var is not set");
  return createHmac("sha256", secret)
    .update("admin-session")
    .digest("base64url");
}

export function verifyLegacySessionToken(value: string | undefined): boolean {
  if (!value || value.includes(".")) return false;
  try {
    return safeEqual(value, makeSessionToken());
  } catch {
    return false;
  }
}

/** @deprecated Use getSessionUser or verifyLegacySessionToken. */
export function verifySessionToken(value: string | undefined): boolean {
  return getSessionUser(value) !== null || verifyLegacySessionToken(value);
}

export function sessionEditedBy(session: SessionUser): string {
  return session.displayName || session.username;
}

export function setSessionCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${COOKIE_MAX_AGE}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
