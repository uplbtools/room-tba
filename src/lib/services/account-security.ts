import { type SQL, sql } from "drizzle-orm";
import { adminUsersTable } from "@drizzle/schema";
import { db } from "@lib/db";

/**
 * Session versions and verified emails (security audit items 1 and 2) live in
 * their own table, `admin_user_auth` (drizzle/0053), keyed by user id. Keeping
 * them off `admin_users` means code that ships before the migration lands
 * never breaks an existing admin_users query: every read here treats a
 * missing table as "version 0, nothing verified" and every write is skipped
 * with a log line, so nobody is locked out while prod catches up.
 *
 * An address counts as verified only while `verified_email` equals the
 * account's current email, so any email change voids it automatically.
 */

/** Undefined table/column: the migration has not been applied yet. */
export function isMissingSchemaError(error: unknown): boolean {
  const code =
    (error as { code?: string })?.code ??
    (error as { cause?: { code?: string } })?.cause?.code;
  return code === "42P01" || code === "42703";
}

function rows<T>(result: unknown): T[] {
  return ((result as { rows?: T[] }).rows ?? []) as T[];
}

let warnedMissing = false;
function warnMissing(action: string) {
  if (warnedMissing) return;
  warnedMissing = true;
  console.warn(
    `admin_user_auth is missing (apply drizzle/0053); ${action} skipped.`,
  );
}

/** SQL condition: this admin_users row's current email is verified. */
export const emailIsVerifiedSql: SQL = sql`EXISTS (
  SELECT 1 FROM admin_user_auth aua
  WHERE aua.user_id = ${adminUsersTable.id}
    AND aua.verified_email = lower(${adminUsersTable.email})
)`;

/**
 * Run a query that filters on verification; before the migration it yields
 * `fallback` (treated as "nothing verified").
 */
export async function withVerification<T>(
  run: () => PromiseLike<T>,
  fallback: T,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
    warnMissing("email verification check");
    return fallback;
  }
}

export async function readSessionVersion(userId: number): Promise<number> {
  try {
    const result = await db.execute(
      sql`SELECT session_version FROM admin_user_auth WHERE user_id = ${userId} LIMIT 1`,
    );
    return Number(
      rows<{ session_version: number }>(result)[0]?.session_version ?? 0,
    );
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
    warnMissing("session version read");
    return 0;
  }
}

/**
 * Revoke every cookie issued so far for this account and return the new
 * version (to re-issue a cookie for the device that asked).
 */
export async function bumpSessionVersion(userId: number): Promise<number> {
  try {
    const result = await db.execute(sql`
      INSERT INTO admin_user_auth (user_id, session_version, updated_at)
      VALUES (${userId}, 1, now())
      ON CONFLICT (user_id) DO UPDATE
        SET session_version = admin_user_auth.session_version + 1,
            updated_at = now()
      RETURNING session_version
    `);
    return Number(
      rows<{ session_version: number }>(result)[0]?.session_version ?? 0,
    );
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
    warnMissing("session revocation");
    return 0;
  }
}

/**
 * Record `email` as verified for the account, but only while it is still the
 * account's current, unverified address and no other account verified it.
 * Resolves false when those conditions fail (stale or reused link).
 */
export async function markEmailVerified(
  userId: number,
  email: string,
): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  const result = await db.execute(sql`
    INSERT INTO admin_user_auth (user_id, verified_email, email_verified_at, updated_at)
    SELECT u.id, ${normalized}, now(), now()
    FROM admin_users u
    WHERE u.id = ${userId}
      AND u.is_active = true
      AND lower(u.email) = ${normalized}
      AND NOT EXISTS (
        SELECT 1 FROM admin_user_auth other
        JOIN admin_users ou ON ou.id = other.user_id
        WHERE other.user_id <> ${userId}
          AND other.verified_email = ${normalized}
          AND lower(ou.email) = ${normalized}
      )
    ON CONFLICT (user_id) DO UPDATE
      SET verified_email = EXCLUDED.verified_email,
          email_verified_at = EXCLUDED.email_verified_at,
          updated_at = now()
      WHERE admin_user_auth.verified_email IS DISTINCT FROM EXCLUDED.verified_email
    RETURNING user_id
  `);
  return rows(result).length > 0;
}

/** Is the account's current email verified? */
export async function isCurrentEmailVerified(userId: number): Promise<boolean> {
  return withVerification(async () => {
    const result = await db.execute(sql`
      SELECT 1 FROM admin_users u
      JOIN admin_user_auth a ON a.user_id = u.id
      WHERE u.id = ${userId} AND a.verified_email = lower(u.email)
      LIMIT 1
    `);
    return rows(result).length > 0;
  }, false);
}

/** Is `email` the verified address of some account (other than `exceptUserId`)? */
export async function isEmailVerifiedByAnotherAccount(
  email: string,
  exceptUserId?: number,
): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  return withVerification(async () => {
    const result = await db.execute(sql`
      SELECT 1 FROM admin_users u
      JOIN admin_user_auth a ON a.user_id = u.id
      WHERE a.verified_email = ${normalized}
        AND lower(u.email) = ${normalized}
        AND u.id <> ${exceptUserId ?? 0}
      LIMIT 1
    `);
    return rows(result).length > 0;
  }, false);
}

/** Does any other account hold `email` (verified or not)? Emails are unique
 * per account (drizzle/0020), so a held address cannot be attached again. */
export async function isEmailHeldByAnotherAccount(
  email: string,
  exceptUserId?: number,
): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT 1 FROM admin_users
    WHERE lower(email) = ${email.trim().toLowerCase()}
      AND id <> ${exceptUserId ?? 0}
    LIMIT 1
  `);
  return rows(result).length > 0;
}

/**
 * Someone just proved they own `email` (Google confirmed it, or they clicked
 * an email-change link). An account that merely typed the address and never
 * confirmed it has no claim, so it lets go; otherwise a squatter could block
 * the real owner, since emails are unique. Verified holders are never
 * touched, and before drizzle/0053 nothing is released at all.
 */
export async function releaseUnverifiedEmail(
  email: string,
  exceptUserId?: number,
): Promise<void> {
  try {
    await db.execute(sql`
      UPDATE admin_users u
      SET email = NULL, updated_at = now()
      WHERE lower(u.email) = ${email.trim().toLowerCase()}
        AND u.id <> ${exceptUserId ?? 0}
        AND NOT EXISTS (
          SELECT 1 FROM admin_user_auth a
          WHERE a.user_id = u.id AND a.verified_email = lower(u.email)
        )
    `);
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
    warnMissing("unverified email release");
  }
}
