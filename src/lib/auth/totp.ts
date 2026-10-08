/**
 * Minimal RFC 6238 TOTP (HMAC-SHA1, 30-second steps, 6 digits) plus the
 * RFC 4648 base32 the authenticator apps expect. Pure (node:crypto only) so
 * bun test covers it against the RFC test vectors.
 */
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const TOTP_STEP_SECONDS = 30;
export const TOTP_DIGITS = 6;

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input.replace(/[\s=-]/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) throw new Error("Invalid base32 character");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** 160-bit secret, the size RFC 4226 recommends for HMAC-SHA1. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function totpStep(nowMs: number): number {
  return Math.floor(nowMs / 1000 / TOTP_STEP_SECONDS);
}

/** HOTP value for one counter (RFC 4226 dynamic truncation). */
export function hotp(secret: Buffer, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secret).update(msg).digest();
  const offset = (hmac[hmac.length - 1] ?? 0) & 0x0f;
  const binary =
    (((hmac[offset] ?? 0) & 0x7f) << 24) |
    ((hmac[offset + 1] ?? 0) << 16) |
    ((hmac[offset + 2] ?? 0) << 8) |
    (hmac[offset + 3] ?? 0);
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

export function totp(secretBase32: string, nowMs = Date.now()): string {
  return hotp(base32Decode(secretBase32), totpStep(nowMs));
}

function sameCode(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return aBuf.length === bBuf.length && timingSafeEqual(aBuf, bBuf);
}

/**
 * Check `code` against the current step and one step either side (clock
 * drift). Returns the matching step so the caller can refuse a replay of a
 * step already used (`lastUsedStep`), or null when nothing matches.
 */
export function verifyTotp(
  secretBase32: string,
  code: string,
  options: {
    nowMs?: number;
    lastUsedStep?: number | null;
    window?: number;
  } = {},
): number | null {
  const normalized = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return null;
  const secret = base32Decode(secretBase32);
  const current = totpStep(options.nowMs ?? Date.now());
  const window = options.window ?? 1;
  for (let delta = -window; delta <= window; delta++) {
    const step = current + delta;
    if (options.lastUsedStep != null && step <= options.lastUsedStep) continue;
    if (sameCode(hotp(secret, step), normalized)) return step;
  }
  return null;
}

/** otpauth:// URI authenticator apps open directly (and QR codes encode). */
export function otpauthUri(
  secretBase32: string,
  account: string,
  issuer = "Room TBA",
): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** Ten single-use recovery codes, `xxxx-xxxx` from an unambiguous alphabet. */
export function generateRecoveryCodes(count = 10): string[] {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  // Reject bytes past the largest multiple of the alphabet size, so every
  // character is equally likely (a plain modulo favours the first few).
  const limit = 256 - (256 % alphabet.length);
  const pick = (): string => {
    for (;;) {
      for (const byte of randomBytes(16)) {
        if (byte < limit) return alphabet[byte % alphabet.length] as string;
      }
    }
  };
  return Array.from({ length: count }, () => {
    const chars = Array.from({ length: 8 }, pick);
    return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
  });
}

export function normalizeRecoveryCode(code: string): string {
  return code
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(normalizeRecoveryCode(code)).digest("hex");
}
