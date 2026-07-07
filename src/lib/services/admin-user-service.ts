import bcrypt from "bcrypt";
import { and, eq, sql } from "drizzle-orm";
import { ADMIN_PASSWORD } from "astro:env/server";
import { adminUsersTable } from "@drizzle/schema";
import { db } from "@lib/db";
import type { SessionUser } from "@lib/admin/auth";

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
  name?: string | null;
};

/**
 * Resolve an OAuth (e.g. Google) Supabase user to an `admin_users` row.
 * Links by supabase id, then by email (existing account without a link),
 * else creates a new `contributor` account (#456).
 */
export async function linkOrCreateContributorFromSupabase(
  identity: SupabaseIdentity,
): Promise<SessionUser | null> {
  const linked = await getAdminUserBySupabaseId(identity.id);
  if (linked) return linked;

  const email = identity.email?.trim().toLowerCase() ?? null;

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
