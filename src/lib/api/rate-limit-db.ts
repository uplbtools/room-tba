import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.js';
import {
	createAccountBackoff,
	createSharedRateLimiter,
	type RateLimitStore
} from './rate-limit-shared.js';

type Timestamp = string | Date;

function rows<T>(result: unknown): T[] {
	return (Array.isArray(result) ? result : ((result as { rows?: T[] }).rows ?? [])) as T[];
}

function storedKey(key: string): string {
	return createHash('sha256').update(key).digest('hex');
}

function toMs(value: Timestamp): number {
	return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export const postgresRateLimitStore: RateLimitStore = {
	async hit(rawKey, windowMs) {
		const key = storedKey(rawKey);
		const result = await db.execute(sql`
      INSERT INTO rate_limits (key, count, reset_at)
      VALUES (${key}, 1, now() + ${windowMs} * interval '1 millisecond')
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limits.reset_at <= now() THEN 1
                     ELSE rate_limits.count + 1 END,
        reset_at = CASE WHEN rate_limits.reset_at <= now() THEN EXCLUDED.reset_at
                        ELSE rate_limits.reset_at END
      RETURNING count, reset_at
    `);
		const [row] = rows<{ count: number; reset_at: Timestamp }>(result);
		if (!row) throw new Error('rate_limits upsert returned no row');
		return { count: Number(row.count), resetAt: toMs(row.reset_at) };
	},

	async lockedUntil(rawKey) {
		const key = storedKey(rawKey);
		const result = await db.execute(
			sql`SELECT reset_at FROM rate_limits WHERE key = ${key} LIMIT 1`
		);
		const [row] = rows<{ reset_at: Timestamp }>(result);
		return row ? toMs(row.reset_at) : null;
	},

	async recordFailure(rawKey, streakResetMs, delayFor) {
		const key = storedKey(rawKey);
		const result = await db.execute(sql`
      INSERT INTO rate_limits (key, count, reset_at)
      VALUES (${key}, 1, now())
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
          WHEN rate_limits.reset_at + ${streakResetMs} * interval '1 millisecond' < now()
          THEN 1 ELSE rate_limits.count + 1 END,
        reset_at = GREATEST(rate_limits.reset_at, now())
      RETURNING count
    `);
		const [row] = rows<{ count: number }>(result);
		const failures = Number(row?.count ?? 1);
		const delay = delayFor(failures);
		const lockResult = await db.execute(sql`
      UPDATE rate_limits
      SET reset_at = GREATEST(reset_at, now() + ${delay} * interval '1 millisecond')
      WHERE key = ${key}
      RETURNING reset_at
    `);
		const [locked] = rows<{ reset_at: Timestamp }>(lockResult);
		return {
			failures,
			lockedUntil: locked ? toMs(locked.reset_at) : Date.now() + delay
		};
	},

	async clear(rawKey) {
		const key = storedKey(rawKey);
		await db.execute(sql`DELETE FROM rate_limits WHERE key = ${key}`);
	}
};

export const sharedRateLimit = createSharedRateLimiter(postgresRateLimitStore);

export const accountBackoff = createAccountBackoff(postgresRateLimitStore);

export async function pruneExpiredRateLimits(): Promise<number> {
	const result = await db.execute(
		sql`DELETE FROM rate_limits WHERE reset_at < now() - interval '1 day'`
	);
	return (result as { count?: number }).count ?? 0;
}
