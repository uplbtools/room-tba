import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import {
  ProposalActionError,
  ProposalValidationError,
  requestProposalChanges,
} from "@lib/services/proposal-service";
import {
  emitProposalReviewed,
  logNotificationEmitFailure,
} from "@lib/notifications/proposal-events";

export const prerender = false;

type RequestChangesBody = { note?: string };

export const POST: APIRoute = async ({ cookies, params, request }) => {
  const auth = await editorSessionOrUnauthorized(cookies, {
    requireReview: true,
  });
  if (auth instanceof Response) return auth;

  const id = Number(params.id);
  if (!Number.isInteger(id)) return json({ error: "Invalid proposal ID" }, 400);

  const body = await request.json().catch(() => ({}) as RequestChangesBody);

  try {
    const proposal = await requestProposalChanges(id, auth.session, body.note);
    if (proposal) {
      void emitProposalReviewed(proposal, "needs_changes").catch((err) => {
        logNotificationEmitFailure(
          "Proposal reviewed notification failed",
          err,
        );
      });
    }
    return json({ success: true, proposal });
  } catch (err) {
    if (err instanceof ProposalValidationError) {
      return json({ error: err.message }, 400);
    }
    if (err instanceof ProposalActionError) {
      return json({ error: err.message }, err.status);
    }
    console.error("Failed to request proposal changes:", err);
    return json({ error: "Failed to update proposal" }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
