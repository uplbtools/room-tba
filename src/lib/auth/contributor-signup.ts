// Pure validation for contributor self-signup (attribution + username
// reservation). No DB/env imports so it runs under `bun test` and can be
// shared with the client modal for the same rules.

export const MIN_CONTRIBUTOR_PASSWORD_LENGTH = 10;
/** bcrypt silently ignores everything past 72 bytes, so refuse longer. */
export const MAX_PASSWORD_BYTES = 72;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 32;
/**
 * USERNAME_PATTERN for the input's `pattern` attribute. Browsers compile it
 * with the `v` flag, where a literal `-` in a class must be escaped.
 */
export const USERNAME_PATTERN_SOURCE = "[a-z0-9][a-z0-9._\\-]*";

// Same charset the OAuth path derives usernames from
// (linkOrCreateContributorFromSupabase): lowercase letters, digits, `. _ -`.
// Must start alphanumeric so usernames stay legible and @-mentionable.
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** UTF-8 length: an emoji or accented letter counts as more than one. */
export function passwordByteLength(password: string): number {
  return new TextEncoder().encode(password).length;
}

/** Why `password` cannot be used as a new password, or null when it can. */
export function newPasswordError(password: string): string | null {
  if (password.length < MIN_CONTRIBUTOR_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_CONTRIBUTOR_PASSWORD_LENGTH} characters.`;
  }
  if (passwordByteLength(password) > MAX_PASSWORD_BYTES) {
    return `Password is too long. Keep it to ${MAX_PASSWORD_BYTES} bytes: about ${MAX_PASSWORD_BYTES} plain letters, fewer with emoji or accented letters.`;
  }
  return null;
}

/** Why `raw` (as typed) is not an allowed username, or null when it is. */
export function usernameError(raw: string): string | null {
  const username = raw.trim().toLowerCase();
  if (
    username.length < USERNAME_MIN_LENGTH ||
    username.length > USERNAME_MAX_LENGTH ||
    !USERNAME_PATTERN.test(username)
  ) {
    return `Username must be ${USERNAME_MIN_LENGTH}–${USERNAME_MAX_LENGTH} characters: lowercase letters, numbers, and . _ - (starting with a letter or number).`;
  }
  return null;
}

export type SignupInput = {
  username?: unknown;
  password?: unknown;
  email?: unknown;
  displayName?: unknown;
};

export type SignupValid = {
  ok: true;
  username: string;
  password: string;
  email: string | null;
  displayName: string | null;
};

export type SignupInvalid = { ok: false; error: string; status: number };

export function validateContributorSignup(
  input: SignupInput,
): SignupValid | SignupInvalid {
  const fail = (error: string, status = 400): SignupInvalid => ({
    ok: false,
    error,
    status,
  });

  if (
    typeof input.username !== "string" ||
    typeof input.password !== "string"
  ) {
    return fail("Username and password are required.");
  }

  const username = input.username.trim().toLowerCase();
  const badUsername = usernameError(username);
  if (badUsername) return fail(badUsername);

  const password = input.password;
  const badPassword = newPasswordError(password);
  if (badPassword) return fail(badPassword);

  let email: string | null = null;
  if (input.email != null && String(input.email).trim() !== "") {
    email = String(input.email).trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email) || email.length > 255) {
      return fail("Enter a valid email address, or leave it blank.");
    }
  }

  let displayName: string | null = null;
  if (input.displayName != null && String(input.displayName).trim() !== "") {
    displayName = String(input.displayName).trim();
    if (displayName.length > 100) {
      return fail("Display name must be 100 characters or fewer.");
    }
  }

  return { ok: true, username, password, email, displayName };
}
