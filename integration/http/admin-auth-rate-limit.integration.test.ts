import { describe, expect, test, beforeAll } from "bun:test";
import { PREVIEW_BASE, skipWithoutE2eDb } from "../helpers/env";

const describeIntegration = skipWithoutE2eDb() ? describe.skip : describe;

let previewUp = false;

describeIntegration("admin auth rate limit", () => {
  beforeAll(async () => {
    try {
      const res = await fetch(`${PREVIEW_BASE}/api/health`, {
        signal: AbortSignal.timeout(2000),
      });
      previewUp = res.ok;
    } catch {
      previewUp = false;
    }
  });

  test("returns 429 after repeated failed logins", async () => {
    if (!previewUp) return;

    let lastStatus = 401;
    for (let i = 0; i < 9; i += 1) {
      const form = new FormData();
      form.set("username", "rate-limit-user");
      form.set("password", "wrong-password");
      const res = await fetch(`${PREVIEW_BASE}/api/admin/auth`, {
        method: "POST",
        body: form,
      });
      lastStatus = res.status;
      if (lastStatus === 429) break;
    }
    expect(lastStatus).toBe(429);
  });
});
