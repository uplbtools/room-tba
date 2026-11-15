import { checkRateLimit, type RateLimiter, type RateLimitResult } from './rate-limit.js';

export type RateLimitStore = {
	hit(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
	lockedUntil(key: string): Promise<number | null>;
	recordFailure(
		key: string,
		streakResetMs: number,
		delayFor: (failures: number) => number
	): Promise<{ failures: number; lockedUntil: number }>;
	clear(key: string): Promise<void>;
};

export function rateLimitDecision(count: number, resetAt: number, max: number): RateLimitResult {
	return count <= max
		? { allowed: true, remaining: max - count, resetAt }
		: { allowed: false, remaining: 0, resetAt };
}

export function createSharedRateLimiter(
	store: Pick<RateLimitStore, 'hit'>,
	fallback: RateLimiter = checkRateLimit
): RateLimiter {
	return async (key, max, windowMs, now = Date.now()) => {
		try {
			const { count, resetAt } = await store.hit(key, windowMs);
			return rateLimitDecision(count, resetAt, max);
		} catch (error) {
			console.error('Shared rate limit unavailable, using memory:', error);
			return fallback(key, max, windowMs, now);
		}
	};
}

export const ACCOUNT_BACKOFF_FREE_FAILURES = 5;
const BACKOFF_BASE_MS = 30 * 1000;
const BACKOFF_MAX_MS = 15 * 60 * 1000;
export const ACCOUNT_BACKOFF_STREAK_RESET_MS = 15 * 60 * 1000;

export function accountBackoffMs(failures: number): number {
	if (failures < ACCOUNT_BACKOFF_FREE_FAILURES) return 0;
	const exponent = failures - ACCOUNT_BACKOFF_FREE_FAILURES;
	return Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** exponent);
}

export type AccountBackoff = {
	check(key: string, now?: number): Promise<number | null>;
	fail(key: string): Promise<void>;
	succeed(key: string): Promise<void>;
};

export function createAccountBackoff(store: RateLimitStore): AccountBackoff {
	return {
		async check(key, now = Date.now()) {
			try {
				const until = await store.lockedUntil(key);
				return until !== null && until > now ? until : null;
			} catch (error) {
				console.error('Account backoff check failed:', error);
				return null;
			}
		},
		async fail(key) {
			try {
				await store.recordFailure(key, ACCOUNT_BACKOFF_STREAK_RESET_MS, accountBackoffMs);
			} catch (error) {
				console.error('Account backoff record failed:', error);
			}
		},
		async succeed(key) {
			try {
				await store.clear(key);
			} catch (error) {
				console.error('Account backoff clear failed:', error);
			}
		}
	};
}

export function accountKey(scope: string, login: string): string {
	return `${scope}:account:${login.trim().toLowerCase().slice(0, 160)}`;
}
