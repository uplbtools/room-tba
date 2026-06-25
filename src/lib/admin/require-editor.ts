import type { AstroCookies } from "astro";
import {
  ADMIN_COOKIE_NAME,
  canPublishDirectly,
  canReviewProposals,
  getSessionUser,
  sessionEditedBy,
  verifyLegacySessionToken,
  type AdminRole,
  type SessionUser,
} from "./auth";

const LEGACY_SESSION: SessionUser = {
  id: 0,
  username: "admin",
  displayName: "Admin",
  role: "admin",
};

export function getEditorSession(cookies: AstroCookies): SessionUser | null {
  const cookie = cookies.get(ADMIN_COOKIE_NAME)?.value;
  const session = getSessionUser(cookie);
  if (session) return session;
  if (verifyLegacySessionToken(cookie)) return LEGACY_SESSION;
  return null;
}

type EditorSessionOptions = {
  requirePublish?: boolean;
  requireReview?: boolean;
};

export function editorSessionOrUnauthorized(
  cookies: AstroCookies,
  options: EditorSessionOptions = {},
): { session: SessionUser; editedBy: string; role: AdminRole } | Response {
  const session = getEditorSession(cookies);
  if (!session) {
    return unauthorized();
  }
  if (options.requirePublish && !canPublishDirectly(session.role)) {
    return forbidden(
      "Your account can suggest edits but cannot publish directly.",
    );
  }
  if (options.requireReview && !canReviewProposals(session.role)) {
    return forbidden("Your account cannot review edit proposals.");
  }
  return {
    session,
    editedBy: sessionEditedBy(session),
    role: session.role,
  };
}

function unauthorized() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

function forbidden(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}
