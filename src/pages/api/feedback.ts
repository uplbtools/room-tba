/**
 * Public in-app feedback endpoint (#881).
 *
 * Unauthenticated write, so it is a trust boundary: rate limit, size cap, and
 * validation all happen before anything is stored. The `feedback` row is the
 * system of record; the Discord notification is best-effort and must never turn
 * a saved message into an error for the sender.
 */
import type { APIRoute } from "astro";
import { feedbackTable } from "@drizzle/schema";
import {
  enforceFeedbackLimits,
  isFeedbackBodyTooLarge,
  validateFeedback,
} from "@lib/api/feedback";
import { errorResponse, json } from "@lib/api/json";
import { clientIp, rateLimitResponse } from "@lib/api/rate-limit";
import { db } from "@lib/db";
import { emitFeedbackSubmitted } from "@lib/notifications/feedback-events";
import { logNotificationEmitFailure } from "@lib/notifications/proposal-events";

export const prerender = false;

const RATE_LIMIT_MESSAGE =
  "Thanks — that is a lot of feedback at once. Try again in a few minutes.";

export const POST: APIRoute = async ({ request }) => {
  // The IP keys an in-memory bucket only; it is never written to the table.
  const denied = enforceFeedbackLimits(clientIp(request));
  if (denied) {
    return rateLimitResponse(denied.resetAt, RATE_LIMIT_MESSAGE);
  }

  if (isFeedbackBodyTooLarge(request.headers.get("content-length"))) {
    return errorResponse("Message is too long.", 413);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const validated = validateFeedback(body);
  if (!validated.ok) {
    return errorResponse(validated.error, validated.status);
  }

  let feedbackId: number;
  try {
    const [row] = await db
      .insert(feedbackTable)
      .values(validated.value)
      .returning({ id: feedbackTable.id });
    if (!row) throw new Error("Insert returned no row");
    feedbackId = row.id;
  } catch (err) {
    console.error("Failed to store feedback:", err);
    return errorResponse(
      "Could not send your message. Try again, or reach us on Discord or Messenger.",
      500,
    );
  }

  // Persisted, so the submission has already succeeded. A gateway 500 only ever
  // reaches the server log (matches emitProposalSubmitted in api/proposals).
  void emitFeedbackSubmitted({ feedbackId, ...validated.value }).catch(
    (err) => {
      logNotificationEmitFailure("Feedback notification emit failed", err);
    },
  );

  return json({ success: true }, 201);
};
