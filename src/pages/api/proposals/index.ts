import type { APIRoute } from "astro";
import { getEditorSession } from "@lib/admin/require-editor";
import {
  ProposalValidationError,
  submitProposal,
} from "@lib/services/proposal-service";

export const prerender = false;

type ProposalBody = {
  entityType?: string;
  entityId?: number;
  baseVersion?: number;
  patch?: Record<string, unknown>;
  submitterName?: string;
  proposalId?: number;
};

export const POST: APIRoute = async ({ cookies, request }) => {
  let body: ProposalBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const session = getEditorSession(cookies);
  const submitterName =
    session?.displayName ||
    session?.username ||
    (typeof body.submitterName === "string" ? body.submitterName : "");

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
