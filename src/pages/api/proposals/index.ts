import type { APIRoute } from "astro";
import { getEditorSession } from "@lib/admin/require-editor";
import {
  checkRateLimit,
  clientIp,
  rateLimitResponse,
} from "@lib/api/rate-limit";
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

const ANON_LIMIT = { max: 8, windowMs: 10 * 60 * 1000 };
const AUTH_LIMIT = { max: 24, windowMs: 10 * 60 * 1000 };

type ProposalBody = {
  entityType?: string;
  entityId?: number;
  baseVersion?: number;
  patch?: Record<string, unknown>;
  submitterName?: string;
  proposalId?: number;
};

export const POST: APIRoute = async ({ cookies, request }) => {
  const session = getEditorSession(cookies);
  const ip = clientIp(request);
  const limit = session ? AUTH_LIMIT : ANON_LIMIT;
  const rate = checkRateLimit(
    `proposals:${session?.id ?? ip}`,
    limit.max,
    limit.windowMs,
  );
  if (!rate.allowed) {
    return rateLimitResponse(rate.resetAt);
  }

  let body: ProposalBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
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
      submitterUserId: session?.id && session.id > 0 ? session.id : null,
      proposalId: Number.isInteger(body.proposalId) ? body.proposalId : null,
    });

    void emitProposalSubmitted(proposal, session?.id).catch((err) => {
      logNotificationEmitFailure("Notification emit failed", err);
    });

    return json({ success: true, proposal }, 201);
  } catch (err) {
    if (err instanceof ProposalValidationError) {
      return json({ error: err.message }, 400);
    }
    const message =
      err instanceof Error && err.message.trim()
        ? err.message
        : "Failed to submit proposal";
    console.error("Failed to submit proposal:", err);
    return json({ error: message }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
