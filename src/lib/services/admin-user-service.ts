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
