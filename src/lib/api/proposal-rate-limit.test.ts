import { describe, expect, test } from "bun:test";
import {
  enforceProposalDeviceLimits,
  enforceProposalSubmitLimits,
  enforceProposalWithdrawLimits,
  isProposalHoneypotTripped,
  PROPOSAL_HONEYPOT_FIELD,
} from "./proposal-rate-limit";
import { resetRateLimitsForTests } from "./rate-limit";

describe("isProposalHoneypotTripped", () => {
  test("empty honeypot is allowed", () => {
    expect(isProposalHoneypotTripped({ [PROPOSAL_HONEYPOT_FIELD]: "" })).toBe(
      false,
    );
    expect(isProposalHoneypotTripped({})).toBe(false);
  });

  test("non-empty honeypot trips", () => {
    expect(
      isProposalHoneypotTripped({ [PROPOSAL_HONEYPOT_FIELD]: "spam" }),
    ).toBe(true);
  });
});

describe("enforceProposalSubmitLimits", () => {
  test("allows anonymous requests under the IP short cap", () => {
    resetRateLimitsForTests();
    const now = 1_000_000;
    for (let i = 0; i < 8; i += 1) {
      expect(enforceProposalSubmitLimits(null, "198.51.100.1", now)).toBeNull();
    }
  });

  test("blocks anonymous requests over the IP short cap", () => {
    resetRateLimitsForTests();
    const now = 2_000_000;
    for (let i = 0; i < 8; i += 1) {
      enforceProposalSubmitLimits(null, "198.51.100.2", now);
    }
    const blocked = enforceProposalSubmitLimits(null, "198.51.100.2", now);
    expect(blocked?.allowed).toBe(false);
  });

  test("blocks signed-in user when user bucket is full even on a fresh IP", () => {
    resetRateLimitsForTests();
    const now = 3_000_000;
    const session = { id: 42 };
    for (let i = 0; i < 24; i += 1) {
      enforceProposalSubmitLimits(session, `198.51.100.${i}`, now);
    }
    const blocked = enforceProposalSubmitLimits(session, "198.51.100.99", now);
    expect(blocked?.allowed).toBe(false);
  });

  test("authenticated traffic on a shared IP does not block a fresh anonymous request", () => {
    resetRateLimitsForTests();
    const now = 3_500_000;
    const ip = "198.51.100.60";
    for (let i = 0; i < 20; i += 1) {
      const result = enforceProposalSubmitLimits({ id: i + 1 }, ip, now);
      expect(result).toBeNull();
    }
    const anonResult = enforceProposalSubmitLimits(null, ip, now);
    expect(anonResult).toBeNull();
  });

  test("daily window blocks after short window resets", () => {
    resetRateLimitsForTests();
    const ip = "198.51.100.50";
    let now = 4_000_000;
    for (let i = 0; i < 40; i += 1) {
      const denied = enforceProposalSubmitLimits(null, ip, now);
      expect(denied).toBeNull();
      now += SHORT_WINDOW_MS + 1;
    }
    const blocked = enforceProposalSubmitLimits(null, ip, now);
    expect(blocked?.allowed).toBe(false);
  });
});

const SHORT_WINDOW_MS = 10 * 60 * 1000;

describe("enforceProposalWithdrawLimits", () => {
  test("blocks after withdraw cap", () => {
    resetRateLimitsForTests();
    const now = 5_000_000;
    for (let i = 0; i < 12; i += 1) {
      expect(
        enforceProposalWithdrawLimits({ id: 7 }, "203.0.113.1", now),
      ).toBeNull();
    }
    const blocked = enforceProposalWithdrawLimits(
      { id: 7 },
      "203.0.113.1",
      now,
    );
    expect(blocked?.allowed).toBe(false);
  });
});

describe("enforceProposalDeviceLimits", () => {
  const device = "11111111-1111-4111-8111-111111111111";

  test("caps one browser across networks at the anonymous rate", () => {
    resetRateLimitsForTests();
    const now = 3_000_000;
    for (let i = 0; i < 8; i += 1) {
      expect(enforceProposalDeviceLimits(device, now)).toBeNull();
    }
    expect(enforceProposalDeviceLimits(device, now)?.allowed).toBe(false);
    // Another browser on the same network is its own bucket.
    expect(
      enforceProposalDeviceLimits("22222222-2222-4222-8222-222222222222", now),
    ).toBeNull();
  });

  test("no device id, no device bucket", () => {
    resetRateLimitsForTests();
    for (let i = 0; i < 20; i += 1) {
      expect(enforceProposalDeviceLimits(null, 4_000_000)).toBeNull();
    }
  });
});
