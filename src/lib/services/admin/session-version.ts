import { eq, sql } from 'drizzle-orm';
import { adminUserAuthTable } from '#lib/server/db/schema.js';
import { db } from '#lib/utils/db.js';

export async function readSessionVersion(userId: number): Promise<number> {
	const [row] = await db
		.select({ sessionVersion: adminUserAuthTable.sessionVersion })
		.from(adminUserAuthTable)
		.where(eq(adminUserAuthTable.userId, userId))
		.limit(1);
	return row?.sessionVersion ?? 0;
}

export async function bumpSessionVersion(userId: number): Promise<number> {
	const [row] = await db
		.insert(adminUserAuthTable)
		.values({ userId, sessionVersion: 1 })
		.onConflictDoUpdate({
			target: adminUserAuthTable.userId,
			set: {
				sessionVersion: sql`${adminUserAuthTable.sessionVersion} + 1`,
				updatedAt: sql`now()`
			}
		})
		.returning({ sessionVersion: adminUserAuthTable.sessionVersion });
	return row.sessionVersion;
}
