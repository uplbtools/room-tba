/**
 * Validation + rate limiting for the public feedback endpoint (#881).
 *
 * `/api/feedback` is unauthenticated, so everything a submitter sends is
 * untrusted. The pure parts live here (not in `src/pages`) so `bun run test`,
 * which only scans `src/lib` and `src/constants`, actually covers them.
 */
import {
  FEEDBACK_CONTACT_MAX,
  FEEDBACK_MESSAGE_MAX,
} from "@constants/feedback";
import { checkRateLimit } from "./rate-limit";

export { FEEDBACK_CONTACT_MAX, FEEDBACK_MESSAGE_MAX };

const SCREEN_MAX = 200;
const APP_VERSION_MAX = 32;

/** Hard cap on the request body, checked before parsing JSON. */
export const FEEDBACK_MAX_BODY_BYTES = 16 * 1024;

const SHORT_WINDOW_MS = 10 * 60 * 1000;
const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
const IP_SHORT_MAX = 5;
const IP_DAILY_MAX = 25;

export type FeedbackSubmission = {
  message: string;
  contact: string | null;
  screen: string | null;
  appVersion: string | null;
  wasOnline: boolean | null;
};

export type FeedbackValidation =
  | { ok: true; value: FeedbackSubmission }
  | { ok: false; error: string; status: 400 | 413 };

function optionalText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

/**
 * Content-Length is a hint, not a guarantee, but rejecting an oversized declared
 * body avoids parsing megabytes of JSON before the length check below runs.
 */
export function isFeedbackBodyTooLarge(contentLength: string | null): boolean {
  const declared = Number(contentLength);
  return Number.isFinite(declared) && declared > FEEDBACK_MAX_BODY_BYTES;
}

export function validateFeedback(body: unknown): FeedbackValidation {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Invalid feedback payload.", status: 400 };
  }

  const raw = body as Record<string, unknown>;
  const message = typeof raw.message === "string" ? raw.message.trim() : "";

  if (!message) {
    return { ok: false, error: "Message is required.", status: 400 };
  }
  if (message.length > FEEDBACK_MESSAGE_MAX) {
    return {
      ok: false,
      error: `Message is too long (max ${FEEDBACK_MESSAGE_MAX} characters).`,
      status: 413,
    };
  }

  // Only a same-site path is kept: a full URL could carry a query string with
  // whatever the sender had typed into search, which is not ours to store.
  const screenRaw = optionalText(raw.screen, SCREEN_MAX);
  const screen =
    screenRaw?.startsWith("/") && !screenRaw.startsWith("//")
      ? (screenRaw.split("?")[0] ?? null)
      : null;

  return {
    ok: true,
    value: {
      message,
      contact: optionalText(raw.contact, FEEDBACK_CONTACT_MAX),
      screen,
      appVersion: optionalText(raw.appVersion, APP_VERSION_MAX),
      wasOnline: typeof raw.wasOnline === "boolean" ? raw.wasOnline : null,
    },
  };
}

/** Same E2E escape hatch the proposal limiter uses, so specs can submit freely. */
function skipRateLimits(): boolean {
  return process.env.ASTRO_E2E_SKIP_LOGIN_RATE_LIMIT === "1";
}

/**
 * Per-IP only — feedback is anonymous, so there is no account to key on. The IP
 * is used for the in-memory bucket and never stored.
 */
export function enforceFeedbackLimits(
  ip: string,
  now = Date.now(),
): { allowed: false; resetAt: number } | null {
  if (skipRateLimits()) return null;

  const short = checkRateLimit(
    `feedback:ip:${ip}`,
    IP_SHORT_MAX,
    SHORT_WINDOW_MS,
    now,
  );
  if (!short.allowed) return { allowed: false, resetAt: short.resetAt };

  const daily = checkRateLimit(
    `feedback:daily:ip:${ip}`,
    IP_DAILY_MAX,
    DAILY_WINDOW_MS,
    now,
  );
  if (!daily.allowed) return { allowed: false, resetAt: daily.resetAt };

  return null;
}
