import { describe, expect, test } from "bun:test";
import {
  base32Decode,
  base32Encode,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  hotp,
  otpauthUri,
  totp,
  verifyTotp,
} from "./totp";

// RFC 6238 appendix B uses the ASCII key "12345678901234567890" (SHA-1).
const RFC_SECRET = base32Encode(Buffer.from("12345678901234567890"));

describe("base32", () => {
  test("round-trips bytes", () => {
    const bytes = Buffer.from([0, 1, 2, 250, 251, 252, 253, 254, 255]);
    expect(base32Decode(base32Encode(bytes)).equals(bytes)).toBe(true);
  });

  test("matches RFC 4648 vectors", () => {
    expect(base32Encode(Buffer.from("foobar"))).toBe("MZXW6YTBOI");
    expect(base32Decode("MZXW6YTBOI").toString()).toBe("foobar");
  });

  test("ignores spaces, dashes and case when decoding", () => {
    expect(base32Decode("mzxw 6ytb-oi").toString()).toBe("foobar");
  });
});

describe("HOTP / TOTP", () => {
  test("RFC 4226 HOTP vectors", () => {
    const key = Buffer.from("12345678901234567890");
    expect(hotp(key, 0)).toBe("755224");
    expect(hotp(key, 1)).toBe("287082");
    expect(hotp(key, 9)).toBe("520489");
  });

  test("RFC 6238 TOTP vectors (last six digits)", () => {
    expect(totp(RFC_SECRET, 59_000)).toBe("287082");
    expect(totp(RFC_SECRET, 1_111_111_109_000)).toBe("081804");
    expect(totp(RFC_SECRET, 1_234_567_890_000)).toBe("005924");
    expect(totp(RFC_SECRET, 2_000_000_000_000)).toBe("279037");
  });

  test("verify accepts the current step and one either side", () => {
    const now = 1_234_567_890_000;
    const code = totp(RFC_SECRET, now);
    expect(verifyTotp(RFC_SECRET, code, { nowMs: now })).toBe(
      Math.floor(now / 30_000),
    );
    expect(
      verifyTotp(RFC_SECRET, code, { nowMs: now + 30_000 }),
    ).not.toBeNull();
    expect(verifyTotp(RFC_SECRET, code, { nowMs: now + 90_000 })).toBeNull();
  });

  test("verify refuses a step already used (replay)", () => {
    const now = 1_234_567_890_000;
    const code = totp(RFC_SECRET, now);
    const step = verifyTotp(RFC_SECRET, code, { nowMs: now });
    expect(
      verifyTotp(RFC_SECRET, code, { nowMs: now, lastUsedStep: step }),
    ).toBeNull();
  });

  test("verify rejects malformed codes", () => {
    expect(verifyTotp(RFC_SECRET, "12345")).toBeNull();
    expect(verifyTotp(RFC_SECRET, "abcdef")).toBeNull();
  });

  test("generated secrets are 160-bit base32", () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(base32Decode(secret).length).toBe(20);
  });
});

describe("otpauth URI and recovery codes", () => {
  test("otpauth URI carries issuer, account and secret", () => {
    const uri = otpauthUri("ABC", "stimmie");
    expect(uri.startsWith("otpauth://totp/Room%20TBA%3Astimmie?")).toBe(true);
    expect(uri).toContain("secret=ABC");
    expect(uri).toContain("issuer=Room+TBA");
  });

  test("recovery codes are unique xxxx-xxxx and hash case-insensitively", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) expect(code).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}$/);
    const first = codes[0] as string;
    expect(hashRecoveryCode(first.toUpperCase().replace("-", " "))).toBe(
      hashRecoveryCode(first),
    );
  });
});
