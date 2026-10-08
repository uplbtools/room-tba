/**
 * Email verification (security audit item 1). Pure: token shape, parsing and
 * mail copy only, so bun test loads it without astro:env or the DB.
 *
 * The token is the shared HMAC signed token (signed-token-core.ts) with
 * `purpose: "email-verify"`, so it cannot be replayed as a reset or
 * email-change token. It expires after 24 hours, and it is single-use because
 * the confirming UPDATE only matches while email_verified_at IS NULL for that
 * exact address.
 */

export const EMAIL_VERIFY_TOKEN_TTL_SECONDS = 24 * 60 * 60;

export type EmailVerifyTokenPayload = {
  purpose: "email-verify";
  userId: number;
  /** Lowercased address the link was sent to. */
  email: string;
};

/** Narrow a verified token payload to the email-verify shape, else null. */
export function parseEmailVerifyToken(
  payload: unknown,
): EmailVerifyTokenPayload | null {
  if (!payload || typeof payload !== "object") return null;
  const candidate = payload as Partial<EmailVerifyTokenPayload>;
  if (
    candidate.purpose !== "email-verify" ||
    !Number.isInteger(candidate.userId) ||
    typeof candidate.email !== "string" ||
    !candidate.email.includes("@")
  ) {
    return null;
  }
  return {
    purpose: "email-verify",
    userId: candidate.userId as number,
    email: candidate.email.toLowerCase(),
  };
}

export function verifyEmailUrl(siteUrl: string, token: string): string {
  return `${siteUrl.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(token)}`;
}

export function buildVerificationEmail(input: {
  siteUrl: string;
  token: string;
  username: string;
}): { subject: string; text: string } {
  return {
    subject: "Confirm your Room TBA email",
    text: [
      `Hi ${input.username},`,
      "",
      "Confirm this address for your Room TBA account so you can reset your password and hear back about your suggested edits:",
      "",
      verifyEmailUrl(input.siteUrl, input.token),
      "",
      "This link works once and expires in 24 hours. If you didn't create a Room TBA account, ignore this email and the address stays unlinked.",
    ].join("\n"),
  };
}

/**
 * Sent instead of a verification link when someone signs up (or changes
 * their email) to an address
 * that already belongs to a verified account. The request itself looks the
 * same to the person typing, so it reveals nothing about who is registered.
 */
export function buildEmailInUseNotice(input: { siteUrl: string }): {
  subject: string;
  text: string;
} {
  return {
    subject: "Someone tried to use your email on Room TBA",
    text: [
      "Someone just tried to add this email address to a Room TBA account, but it is already confirmed on an existing account.",
      "",
      "If it was you, sign in with your existing account instead, or reset your password from the sign-in screen:",
      `${input.siteUrl.replace(/\/$/, "")}/?editor=login`,
      "",
      "If it wasn't you, ignore this email. Nothing on your account changed.",
    ].join("\n"),
  };
}

/**
 * Generic signup failure: says what to do next without confirming that a
 * username or email is registered.
 */
export const SIGNUP_UNAVAILABLE_MESSAGE =
  "We couldn't create an account with those details. Try a different username. If you already have an account, sign in or reset your password instead.";
