import { describe, expect, test } from "bun:test";
import { NoOpNotificationAdapter } from "./noop-adapter";
import type { NotificationEvent } from "./types";

describe("NoOpNotificationAdapter", () => {
  test("notify resolves without error", async () => {
    const adapter = new NoOpNotificationAdapter();
    const event: NotificationEvent = {
      schemaVersion: 1,
      type: "proposal.submitted",
      source: "room-tba",
      occurredAt: new Date().toISOString(),
      payload: { proposalId: 1 },
    };
    await expect(adapter.notify(event)).resolves.toBeUndefined();
  });
});
