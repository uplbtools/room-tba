import bcrypt from "bcrypt";
import { and, eq, sql } from "drizzle-orm";
import { ADMIN_PASSWORD } from "astro:env/server";
import { adminUsersTable } from "@drizzle/schema";
import { db } from "@lib/db";
import type { SessionUser } from "../admin/auth";

export async function countAdminUsers(): Promise<number> {
  const rows = await db
    .select({ c: sql<number>`count(*)` })
    .from(adminUsersTable);
  return Number(rows[0]?.c ?? 0);
}

export async function authenticateAdminUser(
  username: string,
  password: string,
): Promise<SessionUser | null> {
  const normalized = username.trim().toLowerCase();
  if (!normalized || password.length === 0) return null;

  const [user] = await db
    .select()
    .from(adminUsersTable)
    .where(
      and(
        eq(adminUsersTable.username, normalized),
        eq(adminUsersTable.isActive, true),
      ),
    )
    .limit(1);

  if (!user) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName ?? user.username,
    role: user.role ?? "editor",
  };
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
