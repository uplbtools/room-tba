import { describe, expect, it } from "vitest";
import {
  buildReviewEmail,
  buildStaffReviewEmail,
  reviewNoticeSends,
} from "./review-notice-core";

describe("reviewNoticeSends", () => {
  it("contributor gets a copy of their own with no staff addresses", () => {
    const sends = reviewNoticeSends("a@x.ph", ["core@x.ph", "b@x.ph"]);
    expect(sends).toEqual([
      { audience: "contributor", to: ["a@x.ph"] },
      { audience: "staff", to: ["core@x.ph", "b@x.ph"] },
    ]);
    const contributorSend = sends.find((s) => s.audience === "contributor");
    expect(contributorSend?.to).not.toContain("core@x.ph");
  });
  it("staff-only when the contributor has no confirmed email", () => {
    expect(reviewNoticeSends(null, ["core@x.ph"])).toEqual([
      { audience: "staff", to: ["core@x.ph"] },
    ]);
  });
  it("a staff contributor gets only their own copy", () => {
    expect(reviewNoticeSends("Core@x.ph", ["core@x.ph", "b@x.ph"])).toEqual([
      { audience: "contributor", to: ["core@x.ph"] },
      { audience: "staff", to: ["b@x.ph"] },
    ]);
  });
  it("sends nothing when nobody has an address", () => {
    expect(reviewNoticeSends(null, [])).toEqual([]);
  });
});

describe("buildStaffReviewEmail", () => {
  it("says whether the contributor was told", () => {
    const told = buildStaffReviewEmail({
      outcome: "approved",
      entityLabel: "Humanities Building",
      submitterName: "Ana",
      reviewedBy: "stimmie",
      contributorNotified: true,
    });
    expect(told.subject).toBe("Review approved: Humanities Building");
    expect(told.text).toContain("emailed separately");
    const untold = buildStaffReviewEmail({
      outcome: "needs_changes",
      entityLabel: null,
      submitterName: null,
      reviewedBy: "stimmie",
      note: "Add the floor",
      contributorNotified: false,
    });
    expect(untold.subject).toBe("Review changes requested: a map entry");
    expect(untold.text).toContain("no confirmed email");
    expect(untold.text).toContain("Add the floor");
  });
});

describe("buildReviewEmail", () => {
  it("names the edit in the subject", () => {
    const { subject } = buildReviewEmail({
      outcome: "approved",
      entityLabel: "Humanities Building",
      submitterName: "Ana",
      reviewedBy: "stimmie",
    });
    expect(subject).toBe(
      "Your Room TBA edit was approved: Humanities Building",
    );
  });

  it("falls back to neutral wording when the contributor is anonymous", () => {
    const { subject, text } = buildReviewEmail({
      outcome: "rejected",
      entityLabel: null,
      submitterName: null,
      reviewedBy: "stimmie",
    });
    expect(subject).toContain("a map entry");
    expect(text).toContain("Hi there,");
  });

  it("includes a reviewer note only when one was written", () => {
    const withNote = buildReviewEmail({
      outcome: "needs_changes",
      entityLabel: "CAS Annex",
      submitterName: "Ana",
      reviewedBy: "stimmie",
      note: "  Room code looks like a typo.  ",
    });
    expect(withNote.text).toContain(
      "Reviewer note:\nRoom code looks like a typo.",
    );

    const blankNote = buildReviewEmail({
      outcome: "needs_changes",
      entityLabel: "CAS Annex",
      submitterName: "Ana",
      reviewedBy: "stimmie",
      note: "   ",
    });
    expect(blankNote.text).not.toContain("Reviewer note:");
  });
});
