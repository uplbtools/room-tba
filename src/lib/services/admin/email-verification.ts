import { type SQL, sql } from 'drizzle-orm';
import { adminUsersTable } from '#lib/server/db/schema.js';
import { db } from '#lib/utils/db.js';

function rows(result: unknown): unknown[] {
	return (result as { rows?: unknown[] }).rows ?? (result as unknown[]);
}

export const emailIsVerifiedSql: SQL = sql`EXISTS (
	SELECT 1 FROM admin_user_auth aua
	WHERE aua.user_id = ${adminUsersTable.id}
		AND aua.verified_email = lower(${adminUsersTable.email})
)`;

/** False when the address is no longer the account's or another account verified it. */
export async function markEmailVerified(userId: number, email: string): Promise<boolean> {
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

export async function isCurrentEmailVerified(userId: number): Promise<boolean> {
	const result = await db.execute(sql`
		SELECT 1 FROM admin_users u
		JOIN admin_user_auth a ON a.user_id = u.id
		WHERE u.id = ${userId} AND a.verified_email = lower(u.email)
		LIMIT 1
	`);
	return rows(result).length > 0;
}

/** Clears the address from accounts that typed it but never confirmed it. */
export async function releaseUnverifiedEmail(email: string, exceptUserId = 0): Promise<void> {
	await db.execute(sql`
		UPDATE admin_users u
		SET email = NULL, updated_at = now()
		WHERE lower(u.email) = ${email.trim().toLowerCase()}
			AND u.id <> ${exceptUserId}
			AND NOT EXISTS (
				SELECT 1 FROM admin_user_auth a
				WHERE a.user_id = u.id AND a.verified_email = lower(u.email)
			)
	`);
}
