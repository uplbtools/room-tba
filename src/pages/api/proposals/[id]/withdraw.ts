import type { APIRoute } from "astro";
import { getEditorSession } from "@lib/admin/require-editor";
import { clientIp, rateLimitResponse } from "@lib/api/rate-limit";
import { enforceProposalWithdrawLimits } from "@lib/api/proposal-rate-limit";
import { validateSubmitterName } from "@constants/proposals";
import {
  ProposalActionError,
  ProposalValidationError,
  withdrawProposal,
} from "@lib/services/proposal-service";

export const prerender = false;

type WithdrawBody = { submitterName?: string };

export const POST: APIRoute = async ({ cookies, params, request }) => {
  const session = getEditorSession(cookies);
  const ip = clientIp(request);
  const denied = enforceProposalWithdrawLimits(session, ip);
  if (denied) {
    return rateLimitResponse(denied.resetAt);
  }

  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return json({ error: "Invalid proposal ID" }, 400);
  }

  const body = await request.json().catch(() => ({}) as WithdrawBody);
  const submitterName =
    session?.displayName ||
    session?.username ||
    (typeof body.submitterName === "string" ? body.submitterName : "");

  if (!session) {
    const validation = validateSubmitterName(submitterName);
    if (!validation.ok) {
      return json({ error: validation.error }, 400);
    }
  }

  try {
    const proposal = await withdrawProposal(id, session, submitterName);
    return json({ success: true, proposal });
  } catch (err) {
    if (err instanceof ProposalValidationError) {
      return json({ error: err.message }, 400);
    }
    if (err instanceof ProposalActionError) {
      return json({ error: err.message }, err.status);
    }
    console.error("Failed to withdraw proposal:", err);
    return json({ error: "Failed to withdraw proposal" }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
