/**
 * What a password sign-in still owes before it gets a session (auth audit
 * item 19). Pure so the policy is unit tested apart from the DB.
 *
 * - Anyone enrolled in two-step verification must enter a code.
 * - Admins must enroll. The first sign-in without it starts a grace period
 *   and only nudges; once the grace period is over, enrollment is a step.
 * - An account created with a temporary password must choose its own.
 *
 * Google sign-in never reaches this: the Google account's own sign-in (and
 * its 2-Step Verification) stands in for ours.
 */
import type { AdminRole } from "@lib/admin/roles";

export type LoginStep = "mfa" | "enroll_mfa" | "change_password";

export const MFA_GRACE_DAYS = 7;

export type LoginStepInput = {
  role: AdminRole;
  mfaEnabled: boolean;
  /** False when TOTP_ENCRYPTION_KEY is unset: 2FA cannot be offered. */
  mfaAvailable: boolean;
  mustChangePassword: boolean;
  mfaGraceUntil: Date | null;
  now?: Date;
};

export type LoginStepPlan = {
  steps: LoginStep[];
  /** Admin without 2FA inside the grace period: prompt, do not block. */
  enrollSuggested: boolean;
  /** First sign-in that needs a grace period started. */
  startGraceUntil: Date | null;
};

export function planLoginSteps(input: LoginStepInput): LoginStepPlan {
  const now = input.now ?? new Date();
  const steps: LoginStep[] = [];
  let enrollSuggested = false;
  let startGraceUntil: Date | null = null;

  if (input.mfaEnabled) {
    steps.push("mfa");
  } else if (input.role === "admin" && input.mfaAvailable) {
    if (!input.mfaGraceUntil) {
      startGraceUntil = new Date(now.getTime() + MFA_GRACE_DAYS * 86_400_000);
      enrollSuggested = true;
    } else if (input.mfaGraceUntil.getTime() > now.getTime()) {
      enrollSuggested = true;
    } else {
      steps.push("enroll_mfa");
    }
  }

  if (input.mustChangePassword) steps.push("change_password");
  return { steps, enrollSuggested, startGraceUntil };
}

/** Steps still open once `done` (from the signed challenge) are removed. */
export function remainingSteps(
  steps: LoginStep[],
  done: readonly LoginStep[],
): LoginStep[] {
  const satisfied = new Set<LoginStep>(done);
  // Enrolling proves possession of the authenticator, so it also counts as
  // this sign-in's code check.
  if (satisfied.has("enroll_mfa")) satisfied.add("mfa");
  return steps.filter((step) => !satisfied.has(step));
}
