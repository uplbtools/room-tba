import { describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { deriveKey, open, seal } from "./secret-box";

describe("secret box", () => {
  const key = deriveKey(randomBytes(32).toString("base64"));

  test("seal then open returns the plaintext", () => {
    const sealed = seal("JBSWY3DPEHPK3PXP", key);
    expect(sealed.startsWith("v1.")).toBe(true);
    expect(sealed).not.toContain("JBSWY3DPEHPK3PXP");
    expect(open(sealed, key)).toBe("JBSWY3DPEHPK3PXP");
  });

  test("each seal uses a fresh IV", () => {
    expect(seal("same", key)).not.toBe(seal("same", key));
  });

  test("a different key or tampered ciphertext fails", () => {
    const sealed = seal("secret", key);
    expect(() => open(sealed, deriveKey("x".repeat(40)))).toThrow();
    const parts = sealed.split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(() => open(parts.join("."), key)).toThrow();
  });

  test("key formats: hex, base64, long passphrase; short refused", () => {
    expect(deriveKey("a".repeat(64)).length).toBe(32);
    expect(deriveKey(randomBytes(32).toString("base64url")).length).toBe(32);
    expect(deriveKey("a long passphrase that is over 32 chars").length).toBe(
      32,
    );
    expect(() => deriveKey("short")).toThrow();
  });
});
