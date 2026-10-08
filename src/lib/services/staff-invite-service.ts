import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { staffInvitesTable } from "@drizzle/auth-ops-schema";
import { db } from "@lib/db";
import type { AdminRole, SessionUser } from "@lib/admin/auth";
import { isResendConfigured, sendEmail } from "@lib/email/resend";
import {
  AccountActionError,
  type AdminManagedUser,
  createAdminUser,
} from "@lib/services/admin-user-service";
import { SITE_URL } from "@lib/site";

/**
 * Invite-by-email for new staff (auth audit item 19), replacing temporary
 * passwords an admin had to pass along by hand. The invitee picks their own
 * username and password from the link; only a hash of the token is stored.
 */
const INVITE_TTL_DAYS = 7;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_WITH_ARTICLE: Record<AdminRole, string> = {
  admin: "an admin",
  editor: "an editor",
  contributor: "a contributor",
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function inviteUrl(token: string): string {
  return `${SITE_URL}/invite?token=${encodeURIComponent(token)}`;
}

export type PendingInvite = {
  id: number;
  email: string;
  displayName: string | null;
  role: AdminRole;
  expiresAt: string;
  createdAt: string;
};

const pendingColumns = {
  id: staffInvitesTable.id,
  email: staffInvitesTable.email,
  displayName: staffInvitesTable.displayName,
  role: staffInvitesTable.role,
  expiresAt: staffInvitesTable.expiresAt,
  createdAt: staffInvitesTable.createdAt,
};

const isPending = () =>
  and(
    isNull(staffInvitesTable.acceptedAt),
    gt(staffInvitesTable.expiresAt, sql`now()`),
  );

export async function listPendingInvites(): Promise<PendingInvite[]> {
  return db
    .select(pendingColumns)
    .from(staffInvitesTable)
    .where(isPending())
    .orderBy(desc(staffInvitesTable.createdAt));
}

export type CreatedInvite = {
  invite: PendingInvite;
  emailed: boolean;
  /** Returned only when the email could not go out, so the admin can share it. */
  inviteUrl: string | null;
};

export async function createStaffInvite(input: {
  email: string;
  role: AdminRole;
  displayName?: string | null;
  invitedBy: Pick<SessionUser, "id" | "displayName" | "username">;
}): Promise<CreatedInvite> {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email) || email.length > 255) {
    throw new AccountActionError("Enter a valid email address.");
  }
  const displayName = input.displayName?.trim().slice(0, 100) || null;
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000);

  const [invite] = await db
    .insert(staffInvitesTable)
    .values({
      email,
      displayName,
      role: input.role,
      tokenHash: hashToken(token),
      invitedBy: input.invitedBy.id,
      expiresAt: expiresAt.toISOString(),
    })
    .returning(pendingColumns);
  if (!invite)
    throw new AccountActionError("Could not create the invite.", 500);

  const link = inviteUrl(token);
  let emailed = false;
  if (isResendConfigured()) {
    const inviter = input.invitedBy.displayName || input.invitedBy.username;
    try {
      await sendEmail({
        to: [email],
        subject: `You're invited to help edit Room TBA`,
        template: "staff-invite",
        idempotencyKey: `invite:${invite.id}`,
        text: [
          `${inviter} invited you to join Room TBA as ${ROLE_WITH_ARTICLE[input.role]}.`,
          "",
          `Choose your username and password here: ${link}`,
          "",
          `This link works once and expires in ${INVITE_TTL_DAYS} days. If you weren't expecting it, ignore this email.`,
        ].join("\n"),
      });
      emailed = true;
    } catch (error) {
      console.error("Staff invite email failed:", error);
    }
  }
  return { invite, emailed, inviteUrl: emailed ? null : link };
}

export async function revokeInvite(id: number): Promise<void> {
  await db
    .update(staffInvitesTable)
    .set({ expiresAt: sql`now()` })
    .where(
      and(eq(staffInvitesTable.id, id), isNull(staffInvitesTable.acceptedAt)),
    );
}

/** The invite behind a token, if it is still usable. */
export async function findUsableInvite(
  token: string,
): Promise<PendingInvite | null> {
  if (!token) return null;
  const [row] = await db
    .select(pendingColumns)
    .from(staffInvitesTable)
    .where(and(eq(staffInvitesTable.tokenHash, hashToken(token)), isPending()))
    .limit(1);
  return row ?? null;
}

/**
 * Accept an invite: claim it first (so a double submit cannot create two
 * accounts), create the account with the invited role and email, and
 * release the claim if the username turns out to be taken.
 */
export async function acceptStaffInvite(input: {
  token: string;
  username: string;
  password: string;
  displayName?: string | null;
}): Promise<AdminManagedUser> {
  const [claimed] = await db
    .update(staffInvitesTable)
    .set({ acceptedAt: sql`now()` })
    .where(
      and(eq(staffInvitesTable.tokenHash, hashToken(input.token)), isPending()),
    )
    .returning();
  if (!claimed) {
    throw new AccountActionError(
      "This invite is invalid, used, or expired.",
      400,
    );
  }
  try {
    const user = await createAdminUser({
      username: input.username,
      displayName:
        input.displayName?.trim() || claimed.displayName || undefined,
      email: claimed.email,
      password: input.password,
      role: claimed.role,
    });
    await db
      .update(staffInvitesTable)
      .set({ acceptedUserId: user.id })
      .where(eq(staffInvitesTable.id, claimed.id));
    return user;
  } catch (error) {
    await db
      .update(staffInvitesTable)
      .set({ acceptedAt: null })
      .where(eq(staffInvitesTable.id, claimed.id));
    throw error;
  }
}
