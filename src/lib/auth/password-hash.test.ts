import { describe, expect, test } from "bun:test";
import bcrypt from "bcryptjs";
import {
  hashPassword,
  isLegacyPasswordHash,
  verifyPassword,
} from "./password-hash";

describe("password-hash", () => {
  test("PBKDF2 round-trip verifies and rejects wrong passwords", async () => {
    const stored = await hashPassword("correct horse battery staple");
    expect(stored.startsWith("pbkdf2-sha256$")).toBe(true);
    expect(await verifyPassword("correct horse battery staple", stored)).toBe(
      true,
    );
    expect(await verifyPassword("wrong password", stored)).toBe(false);
  });

  test("produces a different salt/hash each time", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toBe(b);
    expect(await verifyPassword("same-password", a)).toBe(true);
    expect(await verifyPassword("same-password", b)).toBe(true);
  });

  test("verifies legacy bcrypt hashes", async () => {
    const stored = await bcrypt.hash("legacy-password", 4);
    expect(isLegacyPasswordHash(stored)).toBe(true);
    expect(await verifyPassword("legacy-password", stored)).toBe(true);
    expect(await verifyPassword("nope", stored)).toBe(false);
  });

  test("rejects malformed stored values", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "pbkdf2-sha256$bad")).toBe(false);
    expect(await verifyPassword("x", "scrypt$16384$8$1$abc$def")).toBe(false);
  });
});
