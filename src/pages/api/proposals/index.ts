import type { APIRoute } from "astro";
import { optionalEditorSession } from "@lib/admin/require-editor";
import { clientIp, rateLimitResponse } from "@lib/api/rate-limit";
import { sharedRateLimit } from "@lib/api/rate-limit-db";
import {
  enforceProposalDeviceLimits,
  enforceProposalSubmitLimits,
  isProposalHoneypotTripped,
} from "@lib/api/proposal-rate-limit";
import { parseContributorId } from "@lib/contributors/contributor-id";
import { validateSubmitterName } from "@constants/proposals";
import {
  ProposalValidationError,
  submitProposal,
} from "@lib/services/proposal-service";
import {
  emitProposalSubmitted,
  logNotificationEmitFailure,
} from "@lib/notifications/proposal-events";

export const prerender = false;

type ProposalBody = {
  entityType?: string;
  entityId?: number;
  baseVersion?: number;
  patch?: Record<string, unknown>;
  submitterName?: string;
  submitterNote?: string;
  proposalId?: number;
  contributorId?: string;
  /** Owner token from the first submit; lets an anonymous author revise. */
  proposalToken?: string;
  _hp?: string;
};

export const POST: APIRoute = async ({ cookies, request }) => {
  const session = await optionalEditorSession(cookies);
  const ip = clientIp(request);
  const denied = await enforceProposalSubmitLimits(
    session,
    ip,
    Date.now(),
    sharedRateLimit,
  );
  if (denied) {
    return rateLimitResponse(denied.resetAt);
  }

  let body: ProposalBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (isProposalHoneypotTripped(body as Record<string, unknown>)) {
    return json({ success: true }, 201);
  }

  // Signed-in submitters are rate limited per account above; the device id
  // still rides along so points earned before signing in follow the account.
  const contributorId = parseContributorId(body.contributorId);
  if (!session) {
    const deviceDenied = await enforceProposalDeviceLimits(
      contributorId,
      Date.now(),
      sharedRateLimit,
    );
    if (deviceDenied) return rateLimitResponse(deviceDenied.resetAt);
  }

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
    const proposal = await submitProposal({
      entityType: body.entityType ?? "",
      entityId: Number(body.entityId),
      baseVersion: Number(body.baseVersion),
      patch: body.patch ?? {},
      submitterName,
      submitterNote:
        typeof body.submitterNote === "string" ? body.submitterNote : null,
      submitterUserId: session?.id && session.id > 0 ? session.id : null,
      proposalId: Number.isInteger(body.proposalId) ? body.proposalId : null,
      contributorId,
      proposalToken:
        typeof body.proposalToken === "string" ? body.proposalToken : null,
    });

    await emitProposalSubmitted(proposal, session?.id).catch((err) => {
      logNotificationEmitFailure("Notification emit failed", err);
    });

    // `proposal.withdrawToken` is present only on a fresh proposal: the
    // client stores it with the proposal ref to withdraw or revise later.
    return json({ success: true, proposal }, 201);
  } catch (err) {
    if (err instanceof ProposalValidationError) {
      return json({ error: err.message }, 400);
    }
    console.error("Failed to submit proposal:", err);
    return json({ error: "Failed to submit proposal" }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
