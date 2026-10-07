/**
 * Create an admin account, or reset an existing one to an active admin with a
 * new password. For bootstrapping or recovering access; day-to-day accounts are
 * managed in the app (Account → Users).
 *
 * The password comes from the environment so it stays out of shell history
 * and `ps` output:
 *
 *   DATABASE_URL=... ADMIN_NEW_PASSWORD='...' bun run scripts/set-admin-user.ts admin
 *
 * Sign in afterwards at /?editor=login (or /admin) with that username.
 */

import bcrypt from "bcrypt";
import { sql } from "drizzle-orm";
import { adminUsersTable } from "../drizzle/schema";
import { openDb } from "./record-bulk-history";

const MIN_PASSWORD_LENGTH = 10;

const username = process.argv[2]?.trim().toLowerCase();
const password = process.env.ADMIN_NEW_PASSWORD ?? "";
if (!username) {
  console.error("Usage: bun run scripts/set-admin-user.ts <username>");
  process.exit(1);
}
if (password.length < MIN_PASSWORD_LENGTH) {
  console.error(
    `Set ADMIN_NEW_PASSWORD (at least ${MIN_PASSWORD_LENGTH} characters).`,
  );
  process.exit(1);
}

const { db, close } = openDb();
try {
  const passwordHash = await bcrypt.hash(password, 12);
  const [row] = await db
    .insert(adminUsersTable)
    .values({
      username,
      displayName: username,
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
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: adminUsersTable.id, username: adminUsersTable.username });
  console.log(`admin account ready: ${row?.username} (id ${row?.id})`);
} finally {
  await close();
}
