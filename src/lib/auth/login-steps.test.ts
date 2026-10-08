import { describe, expect, test } from "bun:test";
import { MFA_GRACE_DAYS, planLoginSteps, remainingSteps } from "./login-steps";

const now = new Date("2026-10-08T00:00:00Z");
const base = {
  mfaEnabled: false,
  mfaAvailable: true,
  mustChangePassword: false,
  mfaGraceUntil: null,
  now,
};

describe("planLoginSteps", () => {
  test("contributors and editors without 2FA sign straight in", () => {
    for (const role of ["contributor", "editor"] as const) {
      expect(planLoginSteps({ ...base, role })).toEqual({
        steps: [],
        enrollSuggested: false,
        startGraceUntil: null,
      });
    }
  });

  test("anyone enrolled must enter a code", () => {
    expect(
      planLoginSteps({ ...base, role: "editor", mfaEnabled: true }).steps,
    ).toEqual(["mfa"]);
  });

  test("an admin's first sign-in without 2FA starts the grace period", () => {
    const plan = planLoginSteps({ ...base, role: "admin" });
    expect(plan.steps).toEqual([]);
    expect(plan.enrollSuggested).toBe(true);
    expect(plan.startGraceUntil?.getTime()).toBe(
      now.getTime() + MFA_GRACE_DAYS * 86_400_000,
    );
  });

  test("inside the grace period an admin is nudged, not blocked", () => {
    const plan = planLoginSteps({
      ...base,
      role: "admin",
      mfaGraceUntil: new Date(now.getTime() + 86_400_000),
    });
    expect(plan.steps).toEqual([]);
    expect(plan.enrollSuggested).toBe(true);
    expect(plan.startGraceUntil).toBeNull();
  });

  test("after the grace period an admin must enroll", () => {
    expect(
      planLoginSteps({
        ...base,
        role: "admin",
        mfaGraceUntil: new Date(now.getTime() - 1),
      }).steps,
    ).toEqual(["enroll_mfa"]);
  });

  test("no enforcement when 2FA is not configured on the server", () => {
    expect(
      planLoginSteps({ ...base, role: "admin", mfaAvailable: false }),
    ).toEqual({ steps: [], enrollSuggested: false, startGraceUntil: null });
  });

  test("a temporary password adds the change step last", () => {
    expect(
      planLoginSteps({
        ...base,
        role: "editor",
        mfaEnabled: true,
        mustChangePassword: true,
      }).steps,
    ).toEqual(["mfa", "change_password"]);
  });
});

describe("remainingSteps", () => {
  test("drops completed steps", () => {
    expect(remainingSteps(["mfa", "change_password"], ["mfa"])).toEqual([
      "change_password",
    ]);
  });

  test("enrolling counts as this sign-in's code check", () => {
    expect(remainingSteps(["mfa"], ["enroll_mfa"])).toEqual([]);
  });
});
