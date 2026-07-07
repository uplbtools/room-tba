import { describe, expect, test } from "bun:test";
import { buildProposalDigest } from "./digest-core";

const SITE = "https://room-tba.uplbtools.me";

describe("buildProposalDigest", () => {
  test("returns null with no pending proposals", () => {
    expect(buildProposalDigest([], SITE)).toBeNull();
  });

  test("formats count, entity label, and submitter", () => {
    const digest = buildProposalDigest(
      [
        {
          entityType: "building",
          entityLabel: "Physical Sciences",
          submitterName: "Yeyel",
          status: "pending",
        },
        {
          entityType: "create_room",
          entityLabel: "CEM 203",
          submitterName: null,
          status: "needs_changes",
        },
      ],
      SITE,
    );
    expect(digest).not.toBeNull();
    expect(digest?.subject).toBe("Room TBA: 2 proposals awaiting review");
    expect(digest?.text).toContain(
      "- building: Physical Sciences — from Yeyel",
    );
    expect(digest?.text).toContain(
      "- new room: CEM 203 — from Anonymous (resubmit requested)",
    );
    expect(digest?.text).toContain(`${SITE}/?editor=login`);
  });

  test("singular subject for one proposal", () => {
    const digest = buildProposalDigest(
      [
        {
          entityType: "dorm",
          entityLabel: "Makiling Hall",
          submitterName: "Stimmie",
          status: "pending",
        },
      ],
      SITE,
    );
    expect(digest?.subject).toBe("Room TBA: 1 proposal awaiting review");
    expect(digest?.text).toContain("is 1 contributor proposal");
  });
});
