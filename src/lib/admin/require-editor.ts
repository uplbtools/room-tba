import type { AstroCookies } from "astro";
import { and, eq } from "drizzle-orm";
import { adminUsersTable } from "@drizzle/schema";
import { db } from "@lib/db";
import {
  ADMIN_COOKIE_NAME,
  canPublishDirectly,
  canReviewProposals,
  getSessionUser,
  sessionEditedBy,
  type AdminRole,
  type SessionUser,
} from "./auth";

export function getEditorSession(cookies: AstroCookies): SessionUser | null {
  const cookie = cookies.get(ADMIN_COOKIE_NAME)?.value;
  return getSessionUser(cookie);
}

type EditorSessionOptions = {
  requirePublish?: boolean;
  requireReview?: boolean;
  requireAdmin?: boolean;
};

/**
 * Re-check the stateless cookie against the DB so deactivation/demotion
 * takes effect immediately instead of after cookie expiry (7 days). One
 * primary-key lookup per privileged request; returns the CURRENT role.
 */
async function revalidateSession(
  session: SessionUser,
): Promise<SessionUser | null> {
  try {
    const [row] = await db
      .select({
        role: adminUsersTable.role,
        displayName: adminUsersTable.displayName,
      })
      .from(adminUsersTable)
      .where(
        and(
          eq(adminUsersTable.id, session.id),
          eq(adminUsersTable.isActive, true),
        ),
      )
      .limit(1);
    if (!row) return null;
    return {
      ...session,
      displayName: row.displayName ?? session.displayName,
      role: row.role ?? session.role,
    };
  } catch (error) {
    // DB down: fail closed for privileged routes.
    console.error("Session revalidation failed:", error);
    return null;
  }
}

export async function editorSessionOrUnauthorized(
  cookies: AstroCookies,
  options: EditorSessionOptions = {},
): Promise<
  { session: SessionUser; editedBy: string; role: AdminRole } | Response
> {
  const cookieSession = getEditorSession(cookies);
  if (!cookieSession) {
    return unauthorized();
  }
  const session = await revalidateSession(cookieSession);
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
  if (options.requireAdmin && session.role !== "admin") {
    return forbidden("Your account cannot manage other users.");
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
