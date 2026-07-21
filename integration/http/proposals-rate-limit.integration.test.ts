import { describe, expect, test, beforeAll } from "bun:test";
import { PREVIEW_BASE, requirePreview, skipWithoutE2eDb } from "../helpers/env";
import { submitProposal } from "../helpers/http";

const describeIntegration = skipWithoutE2eDb() ? describe.skip : describe;

const ISOLATED_IP = "203.0.113.88";

describeIntegration("proposal submit rate limit", () => {
  beforeAll(async () => {
    await requirePreview(PREVIEW_BASE);
  });

  test("returns 429 after repeated anonymous submissions from one IP", async () => {
    let lastStatus = 400;
    for (let i = 0; i < 10; i += 1) {
      const res = await submitProposal(
        {
          entityType: "room",
          entityId: 1,
          baseVersion: 1,
          patch: {},
          // Invalid name: consumes rate limit but does not write edit_proposals.
          submitterName: "x",
          _hp: "",
        },
        undefined,
        { "X-Forwarded-For": ISOLATED_IP },
      );
      lastStatus = res.status;
      if (lastStatus === 429) break;
      expect(lastStatus).toBe(400);
    }
    expect(lastStatus).toBe(429);
    const blocked = await submitProposal(
      {
        entityType: "room",
        entityId: 1,
        baseVersion: 1,
        patch: {},
        submitterName: "x",
        _hp: "",
      },
      undefined,
      { "X-Forwarded-For": ISOLATED_IP },
    );
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
  });
});
