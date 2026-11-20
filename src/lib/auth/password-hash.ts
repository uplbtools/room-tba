import bcrypt from "bcryptjs";

/**
 * Password hashing for the admin/account tables.
 *
 * Workers Free caps CPU at 10ms per invocation and bcryptjs is pure JS
 * (~300ms+ per compare), so new hashes use PBKDF2-SHA256 via WebCrypto
 * (~4ms at 10k iterations). `PASSWORD_PEPPER` (a Worker secret) is mixed
 * into the KDF salt: a leaked `password_hash` column alone cannot be
 * brute-forced offline without it. Stored format is self-describing:
 *
 *   pbkdf2-sha256$<iterations>$<saltHex>$<hashHex>
 *
 * Legacy bcrypt hashes (`$2a$`/`$2b$`) still verify so existing accounts
 * keep working; they are upgraded to PBKDF2 on the next successful
 * password check (see admin-user-service).
 */

const PBKDF2_PREFIX = "pbkdf2-sha256";
const DEFAULT_ITERATIONS = 10_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

const encoder = new TextEncoder();

function iterations(): number {
  const raw = Number(process.env["PASSWORD_KDF_ITERATIONS"]);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_ITERATIONS;
}

function pepperBytes(): Uint8Array {
  return encoder.encode(process.env["PASSWORD_PEPPER"] ?? "");
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function deriveBits(
  password: string,
  salt: Uint8Array,
  iters: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: iters },
      key,
      KEY_BITS,
    ),
  );
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export function isLegacyPasswordHash(stored: string): boolean {
  return stored.startsWith("$2");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const pepper = pepperBytes();
  const kdfSalt = new Uint8Array(pepper.length + salt.length);
  kdfSalt.set(pepper);
  kdfSalt.set(salt, pepper.length);
  const iters = iterations();
  const bits = await deriveBits(password, kdfSalt, iters);
  return `${PBKDF2_PREFIX}$${iters}$${toHex(salt)}$${toHex(bits)}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  if (isLegacyPasswordHash(stored)) {
    return bcrypt.compare(password, stored);
  }
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== PBKDF2_PREFIX) return false;
  const iters = Number(parts[1]);
  if (!Number.isFinite(iters) || iters <= 0) return false;
  const salt = fromHex(parts[2]!);
  const expected = fromHex(parts[3]!);
  if (expected.length !== KEY_BITS / 8) return false;
  const pepper = pepperBytes();
  const kdfSalt = new Uint8Array(pepper.length + salt.length);
  kdfSalt.set(pepper);
  kdfSalt.set(salt, pepper.length);
  const bits = await deriveBits(password, kdfSalt, iters);
  return timingSafeEqual(bits, expected);
}
