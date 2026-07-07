import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import {
  approveProposal,
  ProposalActionError,
} from "@lib/services/proposal-service";
import {
  emitProposalReviewed,
  logNotificationEmitFailure,
} from "@lib/notifications/proposal-events";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, params }) => {
  const auth = await editorSessionOrUnauthorized(cookies, {
    requireReview: true,
  });
  if (auth instanceof Response) return auth;

  const id = Number(params.id);
  if (!Number.isInteger(id)) return json({ error: "Invalid proposal ID" }, 400);

  try {
    const result = await approveProposal(id, auth.session);
    void emitProposalReviewed(result.proposal, "approved").catch((err) => {
      logNotificationEmitFailure("Proposal reviewed notification failed", err);
    });
    return json({ success: true, ...result });
  } catch (err) {
    if (err instanceof ProposalActionError) {
      return json({ error: err.message }, err.status);
    }
    console.error("Failed to approve proposal:", err);
    return json({ error: "Failed to approve proposal" }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
