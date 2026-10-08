import { describe, expect, test } from "bun:test";
import {
  createSignedToken,
  verifySignedToken,
} from "@lib/admin/signed-token-core";
import {
  EMAIL_VERIFY_TOKEN_TTL_SECONDS,
  buildEmailInUseNotice,
  buildVerificationEmail,
  parseEmailVerifyToken,
  SIGNUP_UNAVAILABLE_MESSAGE,
  verifyEmailUrl,
} from "./email-verification";

const SECRET = "test-secret-for-email-verification";

describe("email verification token", () => {
  test("round-trips a signed, expiring token", () => {
    const token = createSignedToken(
      { purpose: "email-verify", userId: 7, email: "Ana@Example.com" },
      EMAIL_VERIFY_TOKEN_TTL_SECONDS,
      SECRET,
    );
    expect(parseEmailVerifyToken(verifySignedToken(token, SECRET))).toEqual({
      purpose: "email-verify",
      userId: 7,
      email: "ana@example.com",
    });
  });

  test("an expired token is rejected", () => {
    const token = createSignedToken(
      { purpose: "email-verify", userId: 7, email: "a@x.ph" },
      -1,
      SECRET,
    );
    expect(parseEmailVerifyToken(verifySignedToken(token, SECRET))).toBeNull();
  });

  test("a tampered token is rejected", () => {
    const token = createSignedToken(
      { purpose: "email-verify", userId: 7, email: "a@x.ph" },
      60,
      SECRET,
    );
    expect(verifySignedToken(`${token}x`, SECRET)).toBeNull();
    expect(verifySignedToken(token, "other-secret")).toBeNull();
  });

  test("tokens minted for another purpose do not verify an email", () => {
    for (const payload of [
      { purpose: "password-reset", userId: 7, pwFp: "abc" },
      {
        purpose: "email-change",
        userId: 7,
        newEmail: "a@x.ph",
        fromEmail: null,
      },
      { purpose: "email-verify", userId: "7", email: "a@x.ph" },
      { purpose: "email-verify", userId: 7, email: "no-at-sign" },
    ]) {
      expect(parseEmailVerifyToken(payload)).toBeNull();
    }
    expect(parseEmailVerifyToken(null)).toBeNull();
  });
});

describe("verification mail copy", () => {
  test("links to the confirm page with the token encoded", () => {
    expect(verifyEmailUrl("https://room-tba.uplb.tools/", "a.b+c")).toBe(
      "https://room-tba.uplb.tools/verify-email?token=a.b%2Bc",
    );
    const mail = buildVerificationEmail({
      siteUrl: "https://room-tba.uplb.tools",
      token: "tok",
      username: "ana",
    });
    expect(mail.text).toContain("/verify-email?token=tok");
    expect(mail.text).toContain("expires in 24 hours");
  });

  test("the in-use notice carries no account details or link token", () => {
    const notice = buildEmailInUseNotice({
      siteUrl: "https://room-tba.uplb.tools",
    });
    expect(notice.text).toContain("/?editor=login");
    expect(notice.text).not.toContain("token=");
  });

  test("the generic signup error says how to proceed without confirming anything", () => {
    expect(SIGNUP_UNAVAILABLE_MESSAGE).toContain("sign in");
    expect(SIGNUP_UNAVAILABLE_MESSAGE).not.toMatch(/taken|exists|registered/i);
  });
});
