import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import bcrypt from "bcrypt";
import { and, desc, eq, getTableColumns, ne, sql } from "drizzle-orm";
import { withUndefinedColumnFallback } from "@lib/db-column-fallback";
import { ADMIN_PASSWORD } from "astro:env/server";
import {
  adminUsersTable,
  contributionsTable,
  editProposalsTable,
  editorHistoryTable,
  plannerPlansTable,
} from "@drizzle/schema";
import { db } from "@lib/db";
import type { SessionUser } from "@lib/admin/auth";
import { createSignedToken, verifySignedToken } from "@lib/admin/signed-token";
import {
  EMAIL_VERIFY_TOKEN_TTL_SECONDS,
  SIGNUP_UNAVAILABLE_MESSAGE,
  buildEmailInUseNotice,
  buildVerificationEmail,
  parseEmailVerifyToken,
  type EmailVerifyTokenPayload,
} from "@lib/auth/email-verification";
import { isResendConfigured, sendEmail } from "@lib/email/resend";
import {
  bumpSessionVersion,
  emailIsVerifiedSql,
  isCurrentEmailVerified,
  isEmailHeldByAnotherAccount,
  isEmailVerifiedByAnotherAccount,
  isMissingSchemaError,
  markEmailVerified,
  releaseUnverifiedEmail,
  withVerification,
} from "./account-security";
import { SITE_URL } from "@lib/site";

export class AccountActionError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AccountActionError";
    this.status = status;
  }
}

const MIN_PASSWORD_LENGTH = 10;
const EMAIL_CHANGE_TOKEN_TTL_SECONDS = 30 * 60;

/** "Sign out of all devices": every existing cookie stops working. */
export async function signOutEverywhere(userId: number): Promise<void> {
  await bumpSessionVersion(userId);
}

function hasPassword(passwordHash: string): boolean {
  return passwordHash.length > 0;
}

/** Columns safe before migration 0015 (`supabase_user_id`). */
const adminUserCredentialColumns = {
  id: adminUsersTable.id,
  username: adminUsersTable.username,
  displayName: adminUsersTable.displayName,
  passwordHash: adminUsersTable.passwordHash,
  role: adminUsersTable.role,
  isActive: adminUsersTable.isActive,
};

function toSessionUser(user: {
  id: number;
  username: string;
  displayName: string | null;
  role: SessionUser["role"] | null;
}): SessionUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName ?? user.username,
    role: user.role ?? "editor",
  };
}

export async function countAdminUsers(): Promise<number> {
  const rows = await db
    .select({ c: sql<number>`count(*)` })
    .from(adminUsersTable);
  return Number(rows[0]?.c ?? 0);
}

export async function getAdminUserBySupabaseId(
  supabaseUserId: string,
): Promise<SessionUser | null> {
  try {
    const [user] = await db
      .select({
        id: adminUsersTable.id,
        username: adminUsersTable.username,
        displayName: adminUsersTable.displayName,
        role: adminUsersTable.role,
      })
      .from(adminUsersTable)
      .where(
        and(
          eq(adminUsersTable.supabaseUserId, supabaseUserId),
          eq(adminUsersTable.isActive, true),
        ),
      )
      .limit(1);

    if (!user) return null;
    return toSessionUser(user);
  } catch (error) {
    console.error("getAdminUserBySupabaseId failed:", error);
    return null;
  }
}

export type SupabaseIdentity = {
  id: string;
  email: string | null;
  emailConfirmed: boolean;
  name?: string | null;
};

/**
 * Resolve an OAuth (e.g. Google) Supabase user to an `admin_users` row.
 * Links by supabase id, then by email (existing account without a link),
 * else creates a new `contributor` account (#456).
 *
 * Email matching/storage only happens for provider-verified emails —
 * otherwise a provider that passes unverified emails would let anyone
 * claim an existing account (including admin rows) by registering its
 * email address at that provider. The match is also limited to rows whose
 * email WE verified (admin_user_auth): a typed, unconfirmed signup email
 * must never let someone pre-claim the real owner's Google sign-in.
 */
export async function linkOrCreateContributorFromSupabase(
  identity: SupabaseIdentity,
): Promise<SessionUser | null> {
  const linked = await getAdminUserBySupabaseId(identity.id);
  if (linked) return linked;

  const email = identity.emailConfirmed
    ? (identity.email?.trim().toLowerCase() ?? null)
    : null;

  if (email) {
    const [byEmail] = await withVerification(
      () =>
        db
          .select({
            id: adminUsersTable.id,
            username: adminUsersTable.username,
            displayName: adminUsersTable.displayName,
            role: adminUsersTable.role,
            isActive: adminUsersTable.isActive,
          })
          .from(adminUsersTable)
          .where(and(sql`lower(email) = ${email}`, emailIsVerifiedSql))
          .limit(1),
      [],
    );
    if (byEmail) {
      if (!byEmail.isActive) return null;
      await db
        .update(adminUsersTable)
        .set({ supabaseUserId: identity.id, updatedAt: sql`now()` })
        .where(eq(adminUsersTable.id, byEmail.id));
      return toSessionUser(byEmail);
    }
  }

  // Google confirmed this address: an account that only typed it (never
  // confirmed) gives it up, so a squatter cannot block the real owner.
  if (email) await releaseUnverifiedEmail(email);

  const base = (email?.split("@")[0] ?? `google-${identity.id.slice(0, 8)}`)
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 48);
  const displayName = identity.name?.trim() || base;

  for (let attempt = 0; attempt < 5; attempt++) {
    const username =
      attempt === 0 ? base : `${base.slice(0, 44)}-${attempt + 1}`;
    try {
      const [created] = await db
        .insert(adminUsersTable)
        .values({
          username,
          displayName,
          // OAuth-only account: no usable password login.
          passwordHash: "",
          role: "contributor",
          // Only reachable with a provider-confirmed email (see above), and
          // only when no verified row holds it yet.
          email,
          isActive: true,
          supabaseUserId: identity.id,
        })
        .returning({
          id: adminUsersTable.id,
          username: adminUsersTable.username,
          displayName: adminUsersTable.displayName,
          role: adminUsersTable.role,
        });
      if (created) {
        // Google confirmed this address, so it starts verified.
        if (email) await markEmailVerifiedBestEffort(created.id, email);
        return toSessionUser(created);
      }
    } catch (error) {
      // Unique violation on username → retry with a suffix.
      const code = (error as { code?: string })?.code;
      if (code !== "23505") throw error;
    }
  }
  return null;
}

async function markEmailVerifiedBestEffort(userId: number, email: string) {
  try {
    await markEmailVerified(userId, email);
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
  }
}

async function findUserByLogin(login: string) {
  const normalized = login.trim().toLowerCase();
  if (!normalized) return null;

  const [byUsername] = await db
    .select(adminUserCredentialColumns)
    .from(adminUsersTable)
    .where(
      and(
        eq(adminUsersTable.isActive, true),
        eq(adminUsersTable.username, normalized),
      ),
    )
    .limit(1);
  if (byUsername) return byUsername;

  if (!normalized.includes("@")) return null;

  // Unverified addresses are just typed text: never a login handle.
  const [byEmail] = await withVerification(
    () =>
      db
        .select(adminUserCredentialColumns)
        .from(adminUsersTable)
        .where(
          and(
            eq(adminUsersTable.isActive, true),
            sql`lower(email) = ${normalized}`,
            emailIsVerifiedSql,
          ),
        )
        .limit(1),
    [],
  );
  return byEmail ?? null;
}

export async function authenticateAdminUser(
  login: string,
  password: string,
): Promise<SessionUser | null> {
  if (!login.trim() || password.length === 0) return null;

  const user = await findUserByLogin(login);
  if (!user?.passwordHash) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return toSessionUser(user);
}

// ── Self-service account management (#456/#272 follow-up) ──

export type AccountProfile = {
  id: number;
  username: string;
  displayName: string;
  email: string | null;
  /** True once the address was confirmed through the emailed link. */
  emailVerified: boolean;
  role: SessionUser["role"];
  hasPassword: boolean;
  linkedGoogle: boolean;
  avatarUrl: string | null;
  profileUrl: string | null;
  showInCredits: boolean;
  createdAt: string;
};

export async function getAccountProfile(
  userId: number,
): Promise<AccountProfile | null> {
  const [row] = await db
    .select({
      id: adminUsersTable.id,
      username: adminUsersTable.username,
      displayName: adminUsersTable.displayName,
      email: adminUsersTable.email,
      role: adminUsersTable.role,
      passwordHash: adminUsersTable.passwordHash,
      supabaseUserId: adminUsersTable.supabaseUserId,
      avatarUrl: adminUsersTable.avatarUrl,
      profileUrl: adminUsersTable.profileUrl,
      showInCredits: adminUsersTable.showInCredits,
      createdAt: adminUsersTable.createdAt,
    })
    .from(adminUsersTable)
    .where(
      and(eq(adminUsersTable.id, userId), eq(adminUsersTable.isActive, true)),
    )
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName ?? row.username,
    email: row.email,
    emailVerified: row.email !== null && (await isCurrentEmailVerified(row.id)),
    role: row.role ?? "editor",
    hasPassword: hasPassword(row.passwordHash),
    linkedGoogle: row.supabaseUserId !== null,
    avatarUrl: row.avatarUrl,
    profileUrl: row.profileUrl,
    showInCredits: row.showInCredits,
    createdAt: row.createdAt,
  };
}

function optionalHttpsUrl(value: string | null | undefined, label: string) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  try {
    if (new URL(trimmed).protocol !== "https:") throw new Error();
  } catch {
    throw new AccountActionError(`${label} must be a valid HTTPS URL.`);
  }
  return trimmed;
}

export async function updateAccountProfile(
  userId: number,
  input: {
    displayName: string;
    avatarUrl?: string | null;
    profileUrl?: string | null;
    showInCredits?: boolean;
  },
): Promise<void> {
  const displayName = input.displayName.trim();
  if (!displayName)
    throw new AccountActionError("Display name cannot be empty.");
  if (
    (input.avatarUrl !== undefined &&
      input.avatarUrl !== null &&
      typeof input.avatarUrl !== "string") ||
    (input.profileUrl !== undefined &&
      input.profileUrl !== null &&
      typeof input.profileUrl !== "string")
  ) {
    throw new AccountActionError("Avatar and profile URLs must be strings.");
  }
  if (
    typeof input.showInCredits !== "undefined" &&
    typeof input.showInCredits !== "boolean"
  ) {
    throw new AccountActionError("showInCredits must be a boolean.");
  }
  const [existing] = await db
    .select({
      avatarUrl: adminUsersTable.avatarUrl,
      profileUrl: adminUsersTable.profileUrl,
      showInCredits: adminUsersTable.showInCredits,
    })
    .from(adminUsersTable)
    .where(
      and(eq(adminUsersTable.id, userId), eq(adminUsersTable.isActive, true)),
    )
    .limit(1);
  if (!existing) throw new AccountActionError("Account not found.", 404);
  await db
    .update(adminUsersTable)
    .set({
      displayName,
      avatarUrl: optionalHttpsUrl(
        input.avatarUrl ?? existing.avatarUrl,
        "Avatar URL",
      ),
      profileUrl: optionalHttpsUrl(
        input.profileUrl ?? existing.profileUrl,
        "Profile URL",
      ),
      showInCredits: input.showInCredits ?? existing.showInCredits,
      updatedAt: sql`now()`,
    })
    .where(
      and(eq(adminUsersTable.id, userId), eq(adminUsersTable.isActive, true)),
    );
}

export async function updateDisplayName(
  userId: number,
  displayName: string,
): Promise<void> {
  const trimmed = displayName.trim();
  if (!trimmed) {
    throw new AccountActionError("Display name cannot be empty.");
  }
  await db
    .update(adminUsersTable)
    .set({ displayName: trimmed, updatedAt: sql`now()` })
    .where(eq(adminUsersTable.id, userId));
}

/** Resolves to the new session version (every other device is signed out). */
export async function changePassword(
  userId: number,
  currentPassword: string | null,
  newPassword: string,
): Promise<number> {
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new AccountActionError(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  }

  const [row] = await db
    .select({ passwordHash: adminUsersTable.passwordHash })
    .from(adminUsersTable)
    .where(eq(adminUsersTable.id, userId))
    .limit(1);
  if (!row) throw new AccountActionError("Account not found.", 404);

  if (hasPassword(row.passwordHash)) {
    const valid =
      typeof currentPassword === "string" &&
      currentPassword.length > 0 &&
      (await bcrypt.compare(currentPassword, row.passwordHash));
    if (!valid) {
      throw new AccountActionError("Current password is incorrect.", 401);
    }
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db
    .update(adminUsersTable)
    .set({ passwordHash, updatedAt: sql`now()` })
    .where(eq(adminUsersTable.id, userId));
  return bumpSessionVersion(userId);
}

// `purpose` stops cross-endpoint replay (an email-change token must never
// pass as a password-reset token — both are signed with the same secret).
// Binding to the current email/password state makes each token single-use:
// once the change applies, the state no longer matches and replays die.
type EmailChangeTokenPayload = {
  purpose: "email-change";
  userId: number;
  newEmail: string;
  fromEmail: string | null;
};

export async function requestEmailChange(
  userId: number,
  newEmail: string,
): Promise<void> {
  const normalized = newEmail.trim().toLowerCase();
  if (!normalized.includes("@")) {
    throw new AccountActionError("Enter a valid email address.");
  }

  // Same answer whether or not the address is taken (no enumeration): a
  // verified owner elsewhere gets a heads-up instead of a change link.
  if (await isEmailVerifiedByAnotherAccount(normalized, userId)) {
    await sendEmail({
      to: [normalized],
      ...buildEmailInUseNotice({ siteUrl: SITE_URL }),
    });
    return;
  }

  const [self] = await db
    .select({ email: adminUsersTable.email })
    .from(adminUsersTable)
    .where(eq(adminUsersTable.id, userId))
    .limit(1);
  if (!self) throw new AccountActionError("Account not found.", 404);

  const token = createSignedToken<EmailChangeTokenPayload>(
    {
      purpose: "email-change",
      userId,
      newEmail: normalized,
      fromEmail: self.email,
    },
    EMAIL_CHANGE_TOKEN_TTL_SECONDS,
  );
  const confirmUrl = `${SITE_URL}/api/account/confirm-email-change?token=${encodeURIComponent(token)}`;

  await sendEmail({
    template: "email-change",
    to: [normalized],
    subject: "Confirm your Room TBA email change",
    text: [
      "Someone (hopefully you) requested to change the email on a Room TBA account to this address.",
      "",
      `Confirm the change: ${confirmUrl}`,
      "",
      "This link expires in 30 minutes. If you didn't request this, ignore this email.",
    ].join("\n"),
  });
}

type PasswordResetTokenPayload = {
  purpose: "password-reset";
  userId: number;
  /** Fingerprint of the password hash the token was issued against. */
  pwFp: string;
};

/** Short non-reversible fingerprint of the stored password hash. */
function passwordHashFingerprint(passwordHash: string): string {
  return createHash("sha256").update(passwordHash).digest("hex").slice(0, 16);
}

/**
 * Request a password-reset email. Always resolves without error, whether or
 * not the login matches an account — reporting failure here would let an
 * attacker enumerate valid usernames/emails.
 */
export async function requestPasswordReset(login: string): Promise<void> {
  const normalized = login.trim().toLowerCase();
  if (!normalized) return;

  const [user] = await db
    .select({
      id: adminUsersTable.id,
      email: adminUsersTable.email,
      isActive: adminUsersTable.isActive,
      passwordHash: adminUsersTable.passwordHash,
    })
    .from(adminUsersTable)
    .where(
      and(
        eq(adminUsersTable.isActive, true),
        normalized.includes("@")
          ? sql`lower(email) = ${normalized}`
          : eq(adminUsersTable.username, normalized),
      ),
    )
    .limit(1);

  // Reset mail only goes to an address the owner proved they control;
  // an unverified typed email could belong to anyone.
  if (!user?.isActive || !user.email) return;
  if (!(await isCurrentEmailVerified(user.id))) return;

  const token = createSignedToken<PasswordResetTokenPayload>(
    {
      purpose: "password-reset",
      userId: user.id,
      pwFp: passwordHashFingerprint(user.passwordHash),
    },
    EMAIL_CHANGE_TOKEN_TTL_SECONDS,
  );
  const resetUrl = `${SITE_URL}/reset-password?token=${encodeURIComponent(token)}`;

  // A failed send throws to the route (still a generic reply to the user)
  // and lands in email_log, where the staff dashboard shows it.
  await sendEmail({
    template: "password-reset",
    to: [user.email],
    subject: "Reset your Room TBA password",
    text: [
      "Someone (hopefully you) requested a password reset for a Room TBA account.",
      "",
      `Choose a new password: ${resetUrl}`,
      "",
      "This link expires in 30 minutes. If you didn't request this, ignore this email. Your password stays unchanged.",
    ].join("\n"),
  });
}

/** Resolves to the account's username (for clearing its sign-in backoff). */
export async function confirmPasswordReset(
  token: string,
  newPassword: string,
): Promise<string> {
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new AccountActionError(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  }
  const payload = verifySignedToken<PasswordResetTokenPayload>(token);
  if (
    payload?.purpose !== "password-reset" ||
    !Number.isInteger(payload.userId) ||
    typeof payload.pwFp !== "string"
  ) {
    throw new AccountActionError("This link is invalid or has expired.", 400);
  }

  const [row] = await db
    .select({
      passwordHash: adminUsersTable.passwordHash,
      username: adminUsersTable.username,
    })
    .from(adminUsersTable)
    .where(eq(adminUsersTable.id, payload.userId))
    .limit(1);
  // Fingerprint mismatch = password already changed since the token was
  // issued (including by this very token) — single-use enforcement.
  if (!row || passwordHashFingerprint(row.passwordHash) !== payload.pwFp) {
    throw new AccountActionError("This link is invalid or has expired.", 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  // New password also revokes every live session: whoever knew the old one
  // (the reason for many resets) is signed out everywhere.
  await db
    .update(adminUsersTable)
    .set({ passwordHash, updatedAt: sql`now()` })
    .where(eq(adminUsersTable.id, payload.userId));
  await bumpSessionVersion(payload.userId);
  return row.username;
}

export async function confirmEmailChange(token: string): Promise<void> {
  const payload = verifySignedToken<EmailChangeTokenPayload>(token);
  if (
    payload?.purpose !== "email-change" ||
    !Number.isInteger(payload.userId) ||
    !payload.newEmail
  ) {
    throw new AccountActionError("This link is invalid or has expired.", 400);
  }
  // Guarding on the issued-against email makes the token single-use and
  // drops stale tokens if the email changed some other way meanwhile.
  // Clicking the link proves control of the new address, so it lands
  // verified, unless another account verified it in the meantime.
  if (await isEmailVerifiedByAnotherAccount(payload.newEmail, payload.userId)) {
    throw new AccountActionError("This link is invalid or has expired.", 400);
  }
  // The link proved ownership, so an unconfirmed squatter lets go of it.
  await releaseUnverifiedEmail(payload.newEmail, payload.userId);
  const updated = await db
    .update(adminUsersTable)
    .set({ email: payload.newEmail, updatedAt: sql`now()` })
    .where(
      and(
        eq(adminUsersTable.id, payload.userId),
        payload.fromEmail === null
          ? sql`email IS NULL`
          : sql`lower(email) = ${payload.fromEmail.toLowerCase()}`,
      ),
    )
    .returning({ id: adminUsersTable.id });
  if (updated.length === 0) {
    throw new AccountActionError("This link is invalid or has expired.", 400);
  }
  await markEmailVerifiedBestEffort(payload.userId, payload.newEmail);
}

export async function linkGoogleIdentity(
  userId: number,
  supabaseUserId: string,
): Promise<void> {
  const [existing] = await db
    .select({ id: adminUsersTable.id })
    .from(adminUsersTable)
    .where(
      and(
        eq(adminUsersTable.supabaseUserId, supabaseUserId),
        ne(adminUsersTable.id, userId),
      ),
    )
    .limit(1);
  if (existing) {
    throw new AccountActionError(
      "This Google account is already linked to a different Room TBA account.",
      409,
    );
  }
  await db
    .update(adminUsersTable)
    .set({ supabaseUserId, updatedAt: sql`now()` })
    .where(eq(adminUsersTable.id, userId));
}

export async function unlinkGoogleIdentity(userId: number): Promise<void> {
  const [row] = await db
    .select({ passwordHash: adminUsersTable.passwordHash })
    .from(adminUsersTable)
    .where(eq(adminUsersTable.id, userId))
    .limit(1);
  if (!row) throw new AccountActionError("Account not found.", 404);
  if (!hasPassword(row.passwordHash)) {
    throw new AccountActionError(
      "Set a password before disconnecting Google, so you can still sign in.",
    );
  }
  await db
    .update(adminUsersTable)
    .set({ supabaseUserId: null, updatedAt: sql`now()` })
    .where(eq(adminUsersTable.id, userId));
}

export async function softDeleteAccount(
  userId: number,
  currentPassword: string | null,
): Promise<void> {
  const [row] = await db
    .select({ passwordHash: adminUsersTable.passwordHash })
    .from(adminUsersTable)
    .where(eq(adminUsersTable.id, userId))
    .limit(1);
  if (!row) throw new AccountActionError("Account not found.", 404);

  if (hasPassword(row.passwordHash)) {
    const valid =
      typeof currentPassword === "string" &&
      currentPassword.length > 0 &&
      (await bcrypt.compare(currentPassword, row.passwordHash));
    if (!valid) {
      throw new AccountActionError("Current password is incorrect.", 401);
    }
  }

  await db
    .update(adminUsersTable)
    .set({
      isActive: false,
      deletedAt: sql`now()`,
      email: null,
      displayName: "Deleted user",
      passwordHash: "",
      supabaseUserId: null,
      updatedAt: sql`now()`,
    })
    .where(eq(adminUsersTable.id, userId));
  // Belt and braces: the row is inactive already, and no cookie survives.
  await bumpSessionVersion(userId);
}

export type AccountDataExport = {
  profile: AccountProfile;
  proposals: unknown[];
  contributions: unknown[];
  plans: unknown;
};

export async function exportAccountData(
  userId: number,
): Promise<AccountDataExport | null> {
  const profile = await getAccountProfile(userId);
  if (!profile) return null;

  const [proposals, contributions, plannerRows] = await Promise.all([
    db
      .select()
      .from(editProposalsTable)
      .where(eq(editProposalsTable.submitterUserId, userId))
      .orderBy(desc(editProposalsTable.createdAt)),
    withUndefinedColumnFallback(
      "export contributions",
      () =>
        db
          .select()
          .from(contributionsTable)
          .where(eq(contributionsTable.userId, userId))
          .orderBy(desc(contributionsTable.createdAt)),
      // Before migration 0053: the same rows without the leaderboard columns.
      () => {
        const { contributorId, kind, revertedAt, ...legacy } =
          getTableColumns(contributionsTable);
        return db
          .select(legacy)
          .from(contributionsTable)
          .where(eq(contributionsTable.userId, userId))
          .orderBy(desc(contributionsTable.createdAt));
      },
    ),
    db
      .select({ data: plannerPlansTable.data })
      .from(plannerPlansTable)
      .where(eq(plannerPlansTable.userId, userId))
      .limit(1),
  ]);

  return {
    profile,
    proposals,
    contributions,
    plans: plannerRows[0]?.data ?? null,
  };
}

// ── Admin-managed users (#225 follow-up: admin creates admin/editor) ──

export type AdminManagedUser = {
  id: number;
  username: string;
  displayName: string;
  email: string | null;
  role: SessionUser["role"];
  isActive: boolean;
  createdAt: string;
};

export async function listAllAdminUsers(): Promise<AdminManagedUser[]> {
  const rows = await db
    .select({
      id: adminUsersTable.id,
      username: adminUsersTable.username,
      displayName: adminUsersTable.displayName,
      email: adminUsersTable.email,
      role: adminUsersTable.role,
      isActive: adminUsersTable.isActive,
      createdAt: adminUsersTable.createdAt,
    })
    .from(adminUsersTable)
    .orderBy(adminUsersTable.username);
  return rows.map((row) => ({
    ...row,
    displayName: row.displayName ?? row.username,
    role: row.role ?? "editor",
  }));
}

export type CreateAdminUserInput = {
  username: string;
  displayName?: string;
  email?: string;
  password: string;
  role: SessionUser["role"];
};

export async function createAdminUser(
  input: CreateAdminUserInput,
): Promise<AdminManagedUser> {
  const username = input.username.trim().toLowerCase();
  if (!username) throw new AccountActionError("Username is required.");
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    throw new AccountActionError(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  }
  const email = input.email?.trim().toLowerCase() || null;
  const passwordHash = await bcrypt.hash(input.password, 12);

  try {
    const [created] = await db
      .insert(adminUsersTable)
      .values({
        username,
        displayName: input.displayName?.trim() || username,
        email,
        passwordHash,
        role: input.role,
        isActive: true,
      })
      .returning({
        id: adminUsersTable.id,
        username: adminUsersTable.username,
        displayName: adminUsersTable.displayName,
        email: adminUsersTable.email,
        role: adminUsersTable.role,
        isActive: adminUsersTable.isActive,
        createdAt: adminUsersTable.createdAt,
      });
    if (!created)
      throw new AccountActionError("Failed to create account.", 500);
    return {
      ...created,
      displayName: created.displayName ?? created.username,
      role: created.role ?? "editor",
    };
  } catch (error) {
    // drizzle wraps the pg error; the unique-violation code lives on `cause`.
    const code =
      (error as { code?: string })?.code ??
      ((error as { cause?: { code?: string } })?.cause?.code as
        | string
        | undefined);
    if (code === "23505") {
      throw new AccountActionError(
        "That username or email is already taken.",
        409,
      );
    }
    throw error;
  }
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function countActiveAdmins(
  tx: Tx | typeof db,
  excludingUserId?: number,
): Promise<number> {
  const rows = await tx
    .select({ c: sql<number>`count(*)` })
    .from(adminUsersTable)
    .where(
      and(
        eq(adminUsersTable.role, "admin"),
        eq(adminUsersTable.isActive, true),
        excludingUserId !== undefined
          ? ne(adminUsersTable.id, excludingUserId)
          : sql`true`,
      ),
    );
  return Number(rows[0]?.c ?? 0);
}

export type UpdateManagedUserInput = {
  role?: SessionUser["role"];
  isActive?: boolean;
};

export async function updateManagedUser(
  targetUserId: number,
  input: UpdateManagedUserInput,
): Promise<
  AdminManagedUser & {
    /** Role and active state before this change, for the audit log. */
    previous: { role: SessionUser["role"]; isActive: boolean };
  }
> {
  // Transaction + advisory lock serializes admin role/active changes so two
  // concurrent demotions can't both pass the last-admin check and leave
  // zero active admins. Lock is xact-scoped: released on commit/rollback.
  let revoke = false;
  const result = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext('admin_users:last-admin-guard'))`,
    );

    const [target] = await tx
      .select({
        id: adminUsersTable.id,
        role: adminUsersTable.role,
        isActive: adminUsersTable.isActive,
      })
      .from(adminUsersTable)
      .where(eq(adminUsersTable.id, targetUserId))
      .limit(1);
    if (!target) throw new AccountActionError("Account not found.", 404);

    const demotingFromAdmin =
      target.role === "admin" &&
      input.role !== undefined &&
      input.role !== "admin";
    const deactivatingAdmin =
      target.role === "admin" && input.isActive === false && target.isActive;

    if (demotingFromAdmin || deactivatingAdmin) {
      const remaining = await countActiveAdmins(tx, targetUserId);
      if (remaining < 1) {
        throw new AccountActionError(
          "Cannot remove the last remaining admin.",
          400,
        );
      }
    }

    const updates: Record<string, unknown> = { updatedAt: sql`now()` };
    if (input.role !== undefined) updates.role = input.role;
    if (input.isActive !== undefined) updates.isActive = input.isActive;
    // A role change or deactivation revokes the user's live sessions (after
    // commit, below), so the new rights apply with a fresh sign-in.
    revoke =
      (input.role !== undefined && input.role !== target.role) ||
      (input.isActive === false && target.isActive);

    const [updated] = await tx
      .update(adminUsersTable)
      .set(updates)
      .where(eq(adminUsersTable.id, targetUserId))
      .returning({
        id: adminUsersTable.id,
        username: adminUsersTable.username,
        displayName: adminUsersTable.displayName,
        email: adminUsersTable.email,
        role: adminUsersTable.role,
        isActive: adminUsersTable.isActive,
        createdAt: adminUsersTable.createdAt,
      });
    if (!updated)
      throw new AccountActionError("Failed to update account.", 500);
    return {
      ...updated,
      displayName: updated.displayName ?? updated.username,
      role: updated.role ?? "editor",
      previous: { role: target.role ?? "editor", isActive: target.isActive },
    };
  });
  if (revoke) await bumpSessionVersion(targetUserId);
  return result;
}

// ── Email verification (security audit item 1) ──

/**
 * Email a verification link to the account's current, unverified address.
 * Best effort: resolves false (logged) when there is nothing to verify or
 * mail is not configured, so signup and admin user creation never fail on it.
 */
export async function sendEmailVerification(userId: number): Promise<boolean> {
  const [row] = await db
    .select({
      username: adminUsersTable.username,
      email: adminUsersTable.email,
      isActive: adminUsersTable.isActive,
    })
    .from(adminUsersTable)
    .where(eq(adminUsersTable.id, userId))
    .limit(1);
  if (!row?.isActive || !row.email) return false;
  if (await isCurrentEmailVerified(userId)) return false;
  if (!isResendConfigured()) {
    console.warn("Email verification skipped: Resend is not configured.");
    return false;
  }
  const email = row.email.trim().toLowerCase();
  const token = createSignedToken<EmailVerifyTokenPayload>(
    { purpose: "email-verify", userId, email },
    EMAIL_VERIFY_TOKEN_TTL_SECONDS,
  );
  try {
    await sendEmail({
      to: [email],
      ...buildVerificationEmail({
        siteUrl: SITE_URL,
        token,
        username: row.username,
      }),
    });
    return true;
  } catch (error) {
    console.error("Email verification send failed:", error);
    return false;
  }
}

/**
 * Confirm an address from the emailed link. Single use: it only applies while
 * the account still holds that exact address unverified, and no other
 * account has verified it since (see markEmailVerified).
 */
export async function verifyEmailToken(token: string): Promise<void> {
  const payload = parseEmailVerifyToken(verifySignedToken<unknown>(token));
  if (!payload) {
    throw new AccountActionError("This link is invalid or has expired.", 400);
  }
  let applied: boolean;
  try {
    applied = await markEmailVerified(payload.userId, payload.email);
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
    throw new AccountActionError(
      "Email confirmation is not available yet. Try the link again in a few minutes.",
      503,
    );
  }
  if (!applied) {
    throw new AccountActionError("This link is invalid or has expired.", 400);
  }
}

/**
 * Contributor self-signup. The response is the same whether or not the email
 * is already registered: a held address is simply not attached to the new
 * account (add it later from Account settings, where the confirmation link
 * proves ownership), and a verified owner gets a heads-up instead. A taken
 * username surfaces as one generic message (SIGNUP_UNAVAILABLE_MESSAGE).
 */
export async function createContributorAccount(input: {
  username: string;
  password: string;
  email: string | null;
  displayName: string | null;
}): Promise<AdminManagedUser> {
  const email = input.email?.trim().toLowerCase() || null;
  // Emails are unique per account, so a held address is left off the new
  // account either way; only a verified holder is told about the attempt.
  const emailHeld = email ? await isEmailHeldByAnotherAccount(email) : false;
  const emailVerifiedElsewhere =
    email && emailHeld ? await isEmailVerifiedByAnotherAccount(email) : false;

  let user: AdminManagedUser;
  try {
    user = await createAdminUser({
      username: input.username,
      displayName: input.displayName ?? undefined,
      email: emailHeld ? undefined : (email ?? undefined),
      password: input.password,
      role: "contributor",
    });
  } catch (error) {
    if (error instanceof AccountActionError && error.status === 409) {
      throw new AccountActionError(SIGNUP_UNAVAILABLE_MESSAGE, 400);
    }
    throw error;
  }

  if (email && emailHeld) {
    if (emailVerifiedElsewhere && isResendConfigured()) {
      try {
        await sendEmail({
          to: [email],
          ...buildEmailInUseNotice({ siteUrl: SITE_URL }),
        });
      } catch (error) {
        console.error("Signup email-in-use notice failed:", error);
      }
    }
  } else if (email) {
    await sendEmailVerification(user.id);
  }
  return user;
}

// ── Break-glass bootstrap (security audit item 7 follow-up) ──

export const BOOTSTRAP_ADMIN_USERNAME = "admin";

/**
 * ADMIN_PASSWORD is no longer a login. It survives only as break-glass for a
 * database with NO active admin (fresh fork, or every admin deactivated):
 * then a blank-username sign-in with that password creates or reactivates
 * the `admin` account and signs it in. As soon as any active admin exists the
 * path is dead, so a leaked env value cannot open an established site. Each
 * use is logged loudly and written to editor_history; the admin should then
 * set their own password (Account settings) and remove ADMIN_PASSWORD.
 */
export async function bootstrapAdminLogin(
  password: string,
  configuredPassword: string | undefined = ADMIN_PASSWORD,
): Promise<SessionUser | null> {
  const expected = configuredPassword ?? "";
  if (!expected || !password) return null;
  // Compare the raw bytes in constant time: pad both to the longer length so
  // timingSafeEqual gets equal-length buffers, and fold the length check into
  // the same result. No digest of the password is computed.
  const givenBytes = Buffer.from(password, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  const width = Math.max(givenBytes.length, expectedBytes.length);
  const given = Buffer.alloc(width);
  const wanted = Buffer.alloc(width);
  givenBytes.copy(given);
  expectedBytes.copy(wanted);
  const sameBytes = timingSafeEqual(given, wanted);
  if (!(sameBytes && givenBytes.length === expectedBytes.length)) return null;

  const passwordHash = await bcrypt.hash(expected, 12);
  const user = await db.transaction(async (tx) => {
    // Same lock as updateManagedUser, so the zero-admin check cannot race
    // an admin being created or reactivated.
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext('admin_users:last-admin-guard'))`,
    );
    const activeAdmins = await countActiveAdmins(tx);
    if (activeAdmins > 0) return null;

    const [row] = await tx
      .insert(adminUsersTable)
      .values({
        username: BOOTSTRAP_ADMIN_USERNAME,
        displayName: "Admin",
        passwordHash,
        role: "admin",
        isActive: true,
      })
      .onConflictDoUpdate({
        target: adminUsersTable.username,
        set: {
          passwordHash,
          role: "admin",
          isActive: true,
          deletedAt: null,
          updatedAt: sql`now()`,
        },
      })
      .returning({
        id: adminUsersTable.id,
        username: adminUsersTable.username,
        displayName: adminUsersTable.displayName,
        role: adminUsersTable.role,
      });
    if (!row) return null;
    await tx.insert(editorHistoryTable).values({
      entityType: "admin_user",
      entityId: row.id,
      action: "bootstrap_login",
      editedBy: "break-glass",
      summary:
        "Break-glass ADMIN_PASSWORD sign-in: no active admin existed, so the admin account was created or reactivated.",
    });
    return toSessionUser(row);
  });

  if (user) {
    console.error(
      `[SECURITY] Break-glass ADMIN_PASSWORD bootstrap used: signed in as "${user.username}" (id ${user.id}) because no active admin existed. Set a personal password and unset ADMIN_PASSWORD.`,
    );
  } else {
    console.warn(
      "[SECURITY] Break-glass ADMIN_PASSWORD sign-in refused: an active admin exists.",
    );
  }
  return user;
}
