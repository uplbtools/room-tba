import { checkRateLimit } from "./rate-limit";

const SHORT_WINDOW_MS = 10 * 60 * 1000;
const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;

const ANON_IP_SHORT_MAX = 8;
const AUTH_IP_SHORT_MAX = 24;
const AUTH_USER_SHORT_MAX = 24;
const ANON_IP_DAILY_MAX = 40;
const AUTH_USER_DAILY_MAX = 120;
const WITHDRAW_SHORT_MAX = 12;

export const PROPOSAL_HONEYPOT_FIELD = "_hp";

export type ProposalRateLimitSession = { id: number } | null | undefined;

export function shouldSkipProposalRateLimits(): boolean {
  return process.env.ASTRO_E2E_SKIP_LOGIN_RATE_LIMIT === "1";
}

/** Bots that fill hidden fields get a silent no-op success (no DB write, no notify). */
export function isProposalHoneypotTripped(
  body: Record<string, unknown>,
): boolean {
  const value = body[PROPOSAL_HONEYPOT_FIELD];
  return typeof value === "string" && value.trim() !== "";
}

export function enforceProposalSubmitLimits(
  session: ProposalRateLimitSession,
  ip: string,
  now = Date.now(),
): { allowed: false; resetAt: number } | null {
  if (shouldSkipProposalRateLimits()) return null;

  const signedIn = Boolean(session && session.id > 0);
  const ipShortMax = signedIn ? AUTH_IP_SHORT_MAX : ANON_IP_SHORT_MAX;

  // Keyed separately per auth state: a shared "proposals:ip:${ip}" bucket
  // would let authenticated traffic (capped at 24) push the counter past the
  // anonymous cap (8), blocking a brand-new anonymous request from the same
  // IP/NAT even though it's the first one that IP has ever sent.
  const ipShort = checkRateLimit(
    `proposals:ip:${signedIn ? "auth" : "anon"}:${ip}`,
    ipShortMax,
    SHORT_WINDOW_MS,
    now,
  );
  if (!ipShort.allowed) {
    return { allowed: false, resetAt: ipShort.resetAt };
  }

  if (signedIn && session) {
    const userShort = checkRateLimit(
      `proposals:user:${session.id}`,
      AUTH_USER_SHORT_MAX,
      SHORT_WINDOW_MS,
      now,
    );
    if (!userShort.allowed) {
      return { allowed: false, resetAt: userShort.resetAt };
    }
  }

  const ipDaily = checkRateLimit(
    `proposals:daily:ip:${ip}`,
    ANON_IP_DAILY_MAX,
    DAILY_WINDOW_MS,
    now,
  );
  if (!ipDaily.allowed) {
    return { allowed: false, resetAt: ipDaily.resetAt };
  }

  if (signedIn && session) {
    const userDaily = checkRateLimit(
      `proposals:daily:user:${session.id}`,
      AUTH_USER_DAILY_MAX,
      DAILY_WINDOW_MS,
      now,
    );
    if (!userDaily.allowed) {
      return { allowed: false, resetAt: userDaily.resetAt };
    }
  }

  return null;
}

export function enforceProposalWithdrawLimits(
  session: ProposalRateLimitSession,
  ip: string,
  now = Date.now(),
): { allowed: false; resetAt: number } | null {
  if (shouldSkipProposalRateLimits()) return null;

  const ipRate = checkRateLimit(
    `proposals-withdraw:ip:${ip}`,
    WITHDRAW_SHORT_MAX,
    SHORT_WINDOW_MS,
    now,
  );
  if (!ipRate.allowed) {
    return { allowed: false, resetAt: ipRate.resetAt };
  }

  if (session && session.id > 0) {
    const userRate = checkRateLimit(
      `proposals-withdraw:user:${session.id}`,
      WITHDRAW_SHORT_MAX,
      SHORT_WINDOW_MS,
      now,
    );
    if (!userRate.allowed) {
      return { allowed: false, resetAt: userRate.resetAt };
    }
  }

  return null;
}
