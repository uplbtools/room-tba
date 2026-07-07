import { createHmac, timingSafeEqual } from "node:crypto";

function signBody(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

/**
 * Stateless signed token for short-lived, single-purpose confirmations
 * (e.g. email-change links). Not session auth — no DB round-trip needed;
 * expiry alone bounds replay risk at this scale.
 */
export function createSignedToken<T extends Record<string, unknown>>(
  payload: T,
  ttlSeconds: number,
  secret: string,
): string {
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    }),
  ).toString("base64url");
  return `${body}.${signBody(body, secret)}`;
}

export function verifySignedToken<T>(token: string, secret: string): T | null {
  if (!token?.includes(".")) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!body || !sig) return null;

  try {
    if (!safeEqual(signBody(body, secret), sig)) return null;
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as {
      exp: number;
    };
    if (
      typeof payload.exp !== "number" ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return payload as T;
  } catch {
    return null;
  }
}
