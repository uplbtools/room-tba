import type { APIRoute } from "astro";
import { optionalEditorSession } from "@lib/admin/require-editor";
import { clientIp, rateLimitResponse } from "@lib/api/rate-limit";
import { sharedRateLimit } from "@lib/api/rate-limit-db";
import { enforceProposalWithdrawLimits } from "@lib/api/proposal-rate-limit";
import {
  ProposalActionError,
  ProposalValidationError,
  withdrawProposal,
} from "@lib/services/proposal-service";

export const prerender = false;

/** Anonymous callers prove ownership with the token returned at submit. */
type WithdrawBody = { proposalToken?: unknown };

export const POST: APIRoute = async ({ cookies, params, request }) => {
  const session = await optionalEditorSession(cookies);
  const ip = clientIp(request);
  const denied = await enforceProposalWithdrawLimits(
    session,
    ip,
    Date.now(),
    sharedRateLimit,
  );
  if (denied) {
    return rateLimitResponse(denied.resetAt);
  }

  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return json({ error: "Invalid proposal ID" }, 400);
  }

  const body = (await request
    .json()
    .catch(() => ({}) as WithdrawBody)) as WithdrawBody;

  try {
    const proposal = await withdrawProposal(id, session, body.proposalToken);
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
