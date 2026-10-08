import { enqueueNotification } from "./outbox";
import type { FeedbackSubmittedPayload } from "./types";

/**
 * Notify the team that in-app feedback arrived (#881).
 *
 * The `feedback` row is the system of record. The event goes through the
 * durable outbox, so a gateway 500 (seen in practice) is retried by cron and a
 * submitter never sees it.
 */
export async function emitFeedbackSubmitted(
  payload: FeedbackSubmittedPayload,
): Promise<void> {
  await enqueueNotification({
    schemaVersion: 1,
    type: "feedback.submitted",
    source: "room-tba",
    occurredAt: new Date().toISOString(),
    idempotencyKey: `feedback:${payload.feedbackId}:submitted`,
    payload,
  });
}
