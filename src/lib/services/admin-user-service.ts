import { createHash } from "crypto";
import bcrypt from "bcrypt";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { ADMIN_PASSWORD } from "astro:env/server";
import {
  adminUsersTable,
  contributionsTable,
  editProposalsTable,
} from "@drizzle/schema";
import { db } from "@lib/db";
import type { SessionUser } from "@lib/admin/auth";
import { createSignedToken, verifySignedToken } from "@lib/admin/signed-token";
import { sendEmail } from "@lib/email/resend";
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
 * email address at that provider.
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
    const [byEmail] = await db
      .select({
        id: adminUsersTable.id,
        username: adminUsersTable.username,
        displayName: adminUsersTable.displayName,
        role: adminUsersTable.role,
        isActive: adminUsersTable.isActive,
      })
      .from(adminUsersTable)
      .where(sql`lower(email) = ${email}`)
      .limit(1);
    if (byEmail) {
      if (!byEmail.isActive) return null;
      await db
        .update(adminUsersTable)
        .set({ supabaseUserId: identity.id, updatedAt: sql`now()` })
        .where(eq(adminUsersTable.id, byEmail.id));
      return toSessionUser(byEmail);
    }
  }

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
      if (created) return toSessionUser(created);
    } catch (error) {
      // Unique violation on username → retry with a suffix.
      const code = (error as { code?: string })?.code;
      if (code !== "23505") throw error;
    }
  }
  return null;
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

  try {
    const [byEmail] = await db
      .select(adminUserCredentialColumns)
      .from(adminUsersTable)
      .where(
        and(
          eq(adminUsersTable.isActive, true),
          sql`lower(email) = ${normalized}`,
        ),
      )
      .limit(1);
    return byEmail ?? null;
  } catch {
    // `admin_users.email` added in drizzle/0018; skip until migrated.
    return null;
  }
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

export async function ensureBootstrapAdminUser(): Promise<void> {
  const existing = await countAdminUsers();
  if (existing > 0 || !ADMIN_PASSWORD) return;

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await db.insert(adminUsersTable).values({
    username: "admin",
    displayName: "Admin",
    passwordHash,
    role: "admin",
    isActive: true,
  });
}

export async function authenticateLegacyAdminPassword(
  password: string,
): Promise<SessionUser | null> {
  if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) return null;
  await ensureBootstrapAdminUser();
  return authenticateAdminUser("admin", password);
}

// ── Self-service account management (#456/#272 follow-up) ──

export type AccountProfile = {
  id: number;
  username: string;
  displayName: string;
  email: string | null;
  role: SessionUser["role"];
  hasPassword: boolean;
  linkedGoogle: boolean;
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
    role: row.role ?? "editor",
    hasPassword: hasPassword(row.passwordHash),
    linkedGoogle: row.supabaseUserId !== null,
    createdAt: row.createdAt,
  };
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

export async function changePassword(
  userId: number,
  currentPassword: string | null,
  newPassword: string,
): Promise<void> {
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

  const [existing] = await db
    .select({ id: adminUsersTable.id })
    .from(adminUsersTable)
    .where(
      and(sql`lower(email) = ${normalized}`, ne(adminUsersTable.id, userId)),
    )
    .limit(1);
  if (existing) {
    throw new AccountActionError("That email is already in use.", 409);
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

  if (!user?.isActive || !user.email) return;

  const token = createSignedToken<PasswordResetTokenPayload>(
    {
      purpose: "password-reset",
      userId: user.id,
      pwFp: passwordHashFingerprint(user.passwordHash),
    },
    EMAIL_CHANGE_TOKEN_TTL_SECONDS,
  );
  const resetUrl = `${SITE_URL}/reset-password?token=${encodeURIComponent(token)}`;

  await sendEmail({
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

export async function confirmPasswordReset(
  token: string,
  newPassword: string,
): Promise<void> {
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new AccountActionError(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  }
  const payload = verifySignedToken<PasswordResetTokenPayload>(token);
  if (
    !payload ||
    payload.purpose !== "password-reset" ||
    !Number.isInteger(payload.userId) ||
    typeof payload.pwFp !== "string"
  ) {
    throw new AccountActionError("This link is invalid or has expired.", 400);
  }

  const [row] = await db
    .select({ passwordHash: adminUsersTable.passwordHash })
    .from(adminUsersTable)
    .where(eq(adminUsersTable.id, payload.userId))
    .limit(1);
  // Fingerprint mismatch = password already changed since the token was
  // issued (including by this very token) — single-use enforcement.
  if (!row || passwordHashFingerprint(row.passwordHash) !== payload.pwFp) {
    throw new AccountActionError("This link is invalid or has expired.", 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db
    .update(adminUsersTable)
    .set({ passwordHash, updatedAt: sql`now()` })
    .where(eq(adminUsersTable.id, payload.userId));
}

export async function confirmEmailChange(token: string): Promise<void> {
  const payload = verifySignedToken<EmailChangeTokenPayload>(token);
  if (
    !payload ||
    payload.purpose !== "email-change" ||
    !Number.isInteger(payload.userId) ||
    !payload.newEmail
  ) {
    throw new AccountActionError("This link is invalid or has expired.", 400);
  }
  // Guarding on the issued-against email makes the token single-use and
  // drops stale tokens if the email changed some other way meanwhile.
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
}

export type AccountDataExport = {
  profile: AccountProfile;
  proposals: unknown[];
  contributions: unknown[];
};

export async function exportAccountData(
  userId: number,
): Promise<AccountDataExport | null> {
  const profile = await getAccountProfile(userId);
  if (!profile) return null;

  const [proposals, contributions] = await Promise.all([
    db
      .select()
      .from(editProposalsTable)
      .where(eq(editProposalsTable.submitterUserId, userId))
      .orderBy(desc(editProposalsTable.createdAt)),
    db
      .select()
      .from(contributionsTable)
      .where(eq(contributionsTable.userId, userId))
      .orderBy(desc(contributionsTable.createdAt)),
  ]);

  return { profile, proposals, contributions };
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
    const code = (error as { code?: string })?.code;
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
): Promise<AdminManagedUser> {
  // Transaction + advisory lock serializes admin role/active changes so two
  // concurrent demotions can't both pass the last-admin check and leave
  // zero active admins. Lock is xact-scoped: released on commit/rollback.
  return db.transaction(async (tx) => {
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
    if (input.role !== undefined) updates["role"] = input.role;
    if (input.isActive !== undefined) updates["isActive"] = input.isActive;

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
    };
  });
}
