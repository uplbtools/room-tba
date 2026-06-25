import type { APIRoute } from "astro";
import { canReviewProposals } from "../../../lib/admin/auth";
import { getEditorSession } from "../../../lib/admin/require-editor";
import {
  canViewProposalSubmitterDetails,
  getProposalById,
  toPublicProposalView,
  toSubmitterProposalView,
} from "../../../lib/services/proposal-service";

export const prerender = false;

export const GET: APIRoute = async ({ cookies, params, url }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return json({ error: "Invalid proposal ID" }, 400);
  }

  const proposal = await getProposalById(id);
  if (!proposal) return json({ error: "Proposal not found" }, 404);

  const session = getEditorSession(cookies);
  const submitterName = url.searchParams.get("submitterName");

  if (session && canReviewProposals(session.role)) {
    return json({ proposal });
  }

  if (
    canViewProposalSubmitterDetails(session, proposal, submitterName)
  ) {
    return json({ proposal: toSubmitterProposalView(proposal) });
  }

  return json({ proposal: toPublicProposalView(proposal) });
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
