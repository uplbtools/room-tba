import { createHmac, timingSafeEqual } from "node:crypto";
import { ADMIN_SESSION_SECRET } from "astro:env/server";
import type { AdminRole } from "./roles";
export type { AdminRole } from "./roles";
export { canPublishDirectly, canReviewProposals } from "./roles";

export type SessionUser = {
  id: number;
  username: string;
  displayName: string;
  role: AdminRole;
  /** admin_users.session_version when the cookie was issued (0053). */
  sessionVersion?: number;
};

type SessionPayload = Omit<SessionUser, "sessionVersion"> & {
  exp: number;
  /** Session version; cookies minted before 0053 carry none and read as 0. */
  sv?: number;
};

const COOKIE_NAME = "admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// No password fallback: a login password must never double as the
// key that signs sessions and reset tokens (knowing it would let anyone
// forge a session for any user).
function signingSecret(): string {
  if (ADMIN_SESSION_SECRET) return ADMIN_SESSION_SECRET;
  throw new Error("ADMIN_SESSION_SECRET must be configured");
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

/**
 * Per-user signed session token (v2). The session version rides inside the
 * signed body, so a cookie cannot claim a newer version than it was issued
 * with; revalidateSession rejects it once the DB value moves on.
 */
export function createSessionToken(user: SessionUser): string {
  const payload: SessionPayload = {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    sv: user.sessionVersion ?? 0,
    exp: Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${signBody(body)}`;
}

/**
 * Cookie-only decode: proves the cookie was signed by us and has not
 * expired, nothing more. Role, activation and revocation live in the DB, so
 * route handlers must go through require-editor.ts (which revalidates); the
 * middleware only uses this as a cheap pre-filter.
 */
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
      sessionVersion: Number.isInteger(payload.sv) ? payload.sv : 0,
    };
  } catch {
    return null;
  }
}

export function sessionEditedBy(session: SessionUser): string {
  return session.displayName || session.username;
}

const PUBLISHING_ACTOR_PREFIX = "room-tba-publisher:";

export function sessionPublishingActor(session: SessionUser): string {
  return `${PUBLISHING_ACTOR_PREFIX}${session.id}:${sessionEditedBy(session)}`;
}

export function parsePublishingActor(
  actor: string,
): { userId: number; displayName: string } | null {
  if (!actor.startsWith(PUBLISHING_ACTOR_PREFIX)) return null;
  const separator = actor.indexOf(":", PUBLISHING_ACTOR_PREFIX.length);
  const userId = Number(actor.slice(PUBLISHING_ACTOR_PREFIX.length, separator));
  const displayName = actor.slice(separator + 1);
  return Number.isInteger(userId) && userId > 0 && displayName
    ? { userId, displayName }
    : null;
}

export function setSessionCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${COOKIE_MAX_AGE}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
