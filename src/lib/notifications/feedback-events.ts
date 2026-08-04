import { getNotificationAdapter } from "./index";
import type { FeedbackSubmittedPayload } from "./types";

/**
 * Notify the team that in-app feedback arrived (#881).
 *
 * The `feedback` row is the system of record; this is best-effort. Callers must
 * persist first and swallow failures via `logNotificationEmitFailure` — the
 * gateway has returned 500 in practice and a submitter must never see that.
 */
export async function emitFeedbackSubmitted(
  payload: FeedbackSubmittedPayload,
): Promise<void> {
  const notifications = getNotificationAdapter();
  await notifications.notify({
    schemaVersion: 1,
    type: "feedback.submitted",
    source: "room-tba",
    occurredAt: new Date().toISOString(),
    idempotencyKey: `feedback:${payload.feedbackId}:submitted`,
    payload,
  });
}
