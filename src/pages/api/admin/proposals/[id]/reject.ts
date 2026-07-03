import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import {
  ProposalActionError,
  rejectProposal,
} from "@lib/services/proposal-service";
import {
  emitProposalReviewed,
  logNotificationEmitFailure,
} from "@lib/notifications/proposal-events";

export const prerender = false;

type RejectBody = { note?: string };

export const POST: APIRoute = async ({ cookies, params, request }) => {
  const auth = editorSessionOrUnauthorized(cookies, { requireReview: true });
  if (auth instanceof Response) return auth;

  const id = Number(params.id);
  if (!Number.isInteger(id)) return json({ error: "Invalid proposal ID" }, 400);

  const body = await request.json().catch(() => ({}) as RejectBody);

  try {
    const proposal = await rejectProposal(id, auth.session, body.note);
    if (proposal) {
      void emitProposalReviewed(proposal, "rejected").catch((err) => {
        logNotificationEmitFailure(
          "Proposal reviewed notification failed",
          err,
        );
      });
    }
    return json({ success: true, proposal });
  } catch (err) {
    if (err instanceof ProposalActionError) {
      return json({ error: err.message }, err.status);
    }
    console.error("Failed to reject proposal:", err);
    return json({ error: "Failed to reject proposal" }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
