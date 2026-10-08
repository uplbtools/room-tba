import { describe, expect, test } from "bun:test";
import { resetRateLimitsForTests } from "./rate-limit";
import {
  ACCOUNT_BACKOFF_FREE_FAILURES,
  accountBackoffMs,
  accountKey,
  createAccountBackoff,
  createSharedRateLimiter,
  rateLimitDecision,
  type RateLimitStore,
} from "./rate-limit-shared";

/** In-memory stand-in with the same semantics as the Postgres upserts. */
function fakeStore(now: () => number): RateLimitStore & {
  rows: Map<string, { count: number; resetAt: number }>;
} {
  const rows = new Map<string, { count: number; resetAt: number }>();
  return {
    rows,
    async hit(key, windowMs) {
      const row = rows.get(key);
      if (!row || row.resetAt <= now()) {
        const fresh = { count: 1, resetAt: now() + windowMs };
        rows.set(key, fresh);
        return { ...fresh };
      }
      row.count += 1;
      return { ...row };
    },
    async lockedUntil(key) {
      return rows.get(key)?.resetAt ?? null;
    },
    async recordFailure(key, streakResetMs, delayFor) {
      const row = rows.get(key);
      const failures =
        !row || row.resetAt + streakResetMs < now() ? 1 : row.count + 1;
      const lockedUntil = now() + delayFor(failures);
      rows.set(key, { count: failures, resetAt: lockedUntil });
      return { failures, lockedUntil };
    },
    async clear(key) {
      rows.delete(key);
    },
  };
}

describe("rateLimitDecision", () => {
  test("allows up to max, blocks after", () => {
    expect(rateLimitDecision(3, 99, 3)).toEqual({
      allowed: true,
      remaining: 0,
      resetAt: 99,
    });
    expect(rateLimitDecision(4, 99, 3)).toEqual({
      allowed: false,
      remaining: 0,
      resetAt: 99,
    });
  });
});

describe("createSharedRateLimiter", () => {
  test("counts across callers through the shared store", async () => {
    let clock = 1_000;
    const store = fakeStore(() => clock);
    // Two "instances" sharing one store see one budget.
    const instanceA = createSharedRateLimiter(store);
    const instanceB = createSharedRateLimiter(store);
    expect((await instanceA("k", 2, 60_000)).allowed).toBe(true);
    expect((await instanceB("k", 2, 60_000)).allowed).toBe(true);
    expect((await instanceA("k", 2, 60_000)).allowed).toBe(false);
    clock += 60_001;
    expect((await instanceB("k", 2, 60_000)).allowed).toBe(true);
  });

  test("falls back to the memory limiter when the store fails", async () => {
    resetRateLimitsForTests();
    const limiter = createSharedRateLimiter({
      hit: async () => {
        throw new Error("db down");
      },
    });
    const first = await limiter("fallback-key", 1, 60_000, 5_000);
    const second = await limiter("fallback-key", 1, 60_000, 5_000);
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
  });
});

describe("accountBackoffMs", () => {
  test("first failures are free, then the wait doubles up to 15 minutes", () => {
    for (let i = 0; i < ACCOUNT_BACKOFF_FREE_FAILURES; i += 1) {
      expect(accountBackoffMs(i)).toBe(0);
    }
    expect(accountBackoffMs(ACCOUNT_BACKOFF_FREE_FAILURES)).toBe(30_000);
    expect(accountBackoffMs(ACCOUNT_BACKOFF_FREE_FAILURES + 1)).toBe(60_000);
    expect(accountBackoffMs(ACCOUNT_BACKOFF_FREE_FAILURES + 2)).toBe(120_000);
    expect(accountBackoffMs(50)).toBe(15 * 60 * 1000);
  });
});

describe("createAccountBackoff", () => {
  test("locks after repeated failures and clears on success", async () => {
    let clock = 10_000;
    const store = fakeStore(() => clock);
    const backoff = createAccountBackoff(store);
    const key = accountKey("login-backoff", " Admin ");
    expect(key).toBe("login-backoff:account:admin");

    for (let i = 0; i < ACCOUNT_BACKOFF_FREE_FAILURES - 1; i += 1) {
      await backoff.fail(key);
      expect(await backoff.check(key, clock)).toBeNull();
    }
    await backoff.fail(key);
    const lockedUntil = await backoff.check(key, clock);
    expect(lockedUntil).toBe(clock + 30_000);

    clock += 30_001;
    expect(await backoff.check(key, clock)).toBeNull();

    await backoff.succeed(key);
    expect(store.rows.has(key)).toBe(false);
  });

  test("a store outage never blocks sign-in", async () => {
    const broken: RateLimitStore = {
      hit: async () => {
        throw new Error("down");
      },
      lockedUntil: async () => {
        throw new Error("down");
      },
      recordFailure: async () => {
        throw new Error("down");
      },
      clear: async () => {
        throw new Error("down");
      },
    };
    const backoff = createAccountBackoff(broken);
    await backoff.fail("k");
    await backoff.succeed("k");
    expect(await backoff.check("k")).toBeNull();
  });
});
