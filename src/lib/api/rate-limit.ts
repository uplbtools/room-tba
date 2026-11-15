type RateLimitBucket = {
	count: number;
	resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

export type RateLimitResult =
	| { allowed: true; remaining: number; resetAt: number }
	| { allowed: false; remaining: 0; resetAt: number };

/** Best-effort in-memory limiter (per server instance). */
export function checkRateLimit(
	key: string,
	max: number,
	windowMs: number,
	now = Date.now()
): RateLimitResult {
	const bucket = buckets.get(key);
	if (!bucket || now >= bucket.resetAt) {
		const resetAt = now + windowMs;
		buckets.set(key, { count: 1, resetAt });
		return { allowed: true, remaining: max - 1, resetAt };
	}

	if (bucket.count >= max) {
		return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
	}

	bucket.count += 1;
	return {
		allowed: true,
		remaining: max - bucket.count,
		resetAt: bucket.resetAt
	};
}

export function clientIp(request: Request): string {
	for (const header of ['x-vercel-forwarded-for', 'x-real-ip']) {
		const value = request.headers.get(header)?.split(',')[0]?.trim();
		if (value) return value;
	}
	return 'unknown';
}

export function rateLimitResponse(
	resetAt: number,
	message = 'Too many requests. Wait a few minutes and try again.'
) {
	const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
	return new Response(
		JSON.stringify({
			error: message
		}),
		{
			status: 429,
			headers: {
				'Content-Type': 'application/json',
				'Retry-After': String(retryAfter)
			}
		}
	);
}

/** @internal test helper */
export function resetRateLimitsForTests() {
	buckets.clear();
}
