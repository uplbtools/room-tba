import { describe, expect, test, beforeAll } from "bun:test";
import {
  PREVIEW_BASE,
  requirePreview,
  previewFetchInit,
  skipWithoutE2eDb,
} from "../helpers/env";

const describeIntegration = skipWithoutE2eDb() ? describe.skip : describe;

describeIntegration("admin auth rate limit", () => {
  beforeAll(async () => {
    await requirePreview(PREVIEW_BASE);
  });

  test("returns 429 after repeated failed logins", async () => {
    let lastStatus = 401;
    for (let i = 0; i < 9; i += 1) {
      const form = new FormData();
      form.set("username", "rate-limit-user");
      form.set("password", "wrong-password");
      const res = await fetch(
        `${PREVIEW_BASE}/api/admin/auth`,
        previewFetchInit({
          method: "POST",
          body: form,
          // Isolated IP bucket: the 9 failed attempts here must not consume
          // the shared runner IP's login budget for later suite logins.
          headers: { "X-Forwarded-For": "203.0.113.77" },
        }),
      );
      lastStatus = res.status;
      if (lastStatus === 429) break;
    }
    expect(lastStatus).toBe(429);
  });
});
