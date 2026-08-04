import { beforeAll, describe, expect, test } from "bun:test";
import {
  PREVIEW_BASE,
  previewFetchInit,
  requirePreview,
  skipWithoutE2eDb,
} from "../helpers/env";

const describeIntegration = skipWithoutE2eDb() ? describe.skip : describe;

/** Each test gets its own IP so one case cannot spend another's budget. */
function sendFeedback(body: unknown, ip: string) {
  return fetch(
    `${PREVIEW_BASE}/api/feedback`,
    previewFetchInit({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": ip,
      },
      body: JSON.stringify(body),
    }),
  );
}

describeIntegration("POST /api/feedback", () => {
  beforeAll(async () => {
    await requirePreview(PREVIEW_BASE);
  });

  test("stores a valid message and reports success", async () => {
    const res = await sendFeedback(
      {
        message: "integration test: the map is blank on my phone",
        contact: "",
        screen: "/planner?term=1252",
        appVersion: "v0.0.0-integration",
        wasOnline: true,
      },
      "203.0.113.40",
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ success: true });
  });

  test("rejects an empty message with 400", async () => {
    const res = await sendFeedback({ message: "   " }, "203.0.113.41");
    expect(res.status).toBe(400);
  });

  test("rejects a non-object payload with 400", async () => {
    const res = await sendFeedback("just a string", "203.0.113.42");
    expect(res.status).toBe(400);
  });

  test("rejects an oversized message with 413", async () => {
    const res = await sendFeedback(
      { message: "x".repeat(2001) },
      "203.0.113.43",
    );
    expect(res.status).toBe(413);
  });

  test("returns 429 with Retry-After after repeated sends from one IP", async () => {
    let lastStatus = 201;
    for (let i = 0; i < 12; i += 1) {
      const res = await sendFeedback(
        { message: `integration rate limit probe ${i}` },
        "203.0.113.44",
      );
      lastStatus = res.status;
      if (lastStatus === 429) {
        expect(res.headers.get("Retry-After")).toBeTruthy();
        break;
      }
      expect(lastStatus).toBe(201);
    }
    expect(lastStatus).toBe(429);
  });
});
