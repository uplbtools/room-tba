/**
 * AES-256-GCM sealing for secrets stored at rest (TOTP seeds). Pure: the
 * key is passed in, so bun test can cover it; secret-box-env.ts supplies
 * TOTP_ENCRYPTION_KEY at runtime.
 *
 * Output: `v1.<iv>.<tag>.<ciphertext>`, each part base64url.
 */
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

/**
 * Accept a 32-byte key as base64/base64url/hex, or any other string of 32+
 * characters, which is stretched with SHA-256. Short keys are refused.
 */
export function deriveKey(raw: string): Buffer {
  const trimmed = raw.trim();
  if (/^[0-9a-f]{64}$/i.test(trimmed)) return Buffer.from(trimmed, "hex");
  try {
    const decoded = Buffer.from(trimmed, "base64url");
    if (decoded.length === 32 && /^[A-Za-z0-9+/_=-]+$/.test(trimmed)) {
      return decoded;
    }
  } catch {
    // fall through to stretching
  }
  if (trimmed.length < 32) {
    throw new Error(
      "Encryption key must be 32 bytes (base64 or hex) or 32+ characters.",
    );
  }
  return createHash("sha256").update(trimmed).digest();
}

export function seal(plaintext: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return ["v1", iv, tag, ciphertext]
    .map((part) =>
      typeof part === "string" ? part : part.toString("base64url"),
    )
    .join(".");
}

export function open(sealed: string, key: Buffer): string {
  const [version, iv, tag, ciphertext] = sealed.split(".");
  if (version !== "v1" || !iv || !tag || ciphertext === undefined) {
    throw new Error("Unrecognized sealed secret");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
