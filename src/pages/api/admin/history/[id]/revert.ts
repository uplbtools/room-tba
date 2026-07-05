import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import {
  HistoryRevertError,
  revertToHistoryEntry,
} from "@lib/services/history-service";
import {
  DuplicateNameError,
  EditConflictError,
} from "@lib/services/admin-service";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, params, request }) => {
  const auth = editorSessionOrUnauthorized(cookies, { requirePublish: true });
  if (auth instanceof Response) return auth;

  const historyId = Number(params.id);
  if (!Number.isInteger(historyId) || historyId < 1) {
    return json({ error: "Invalid history entry." }, 400);
  }

  const body = (await request.json().catch(() => ({}))) as {
    expectedVersion?: number;
    summary?: string;
  };
  const expectedVersion = Number(body.expectedVersion);
  const summary = (body.summary ?? "").trim();
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    return json({ error: "expectedVersion is required." }, 400);
  }
  if (!summary) {
    return json({ error: "A short summary is required to restore." }, 400);
  }
  if (summary.length > 200) {
    return json({ error: "Summary must be 200 characters or fewer." }, 400);
  }

  try {
    const entity = await revertToHistoryEntry({
      historyId,
      expectedVersion,
      editedBy: auth.editedBy,
      summary,
    });
    return json({ success: true, entity });
  } catch (err) {
    if (err instanceof HistoryRevertError) {
      return json({ error: err.message }, err.status);
    }
    if (err instanceof EditConflictError) {
      return json(
        {
          error: "This entry was changed by another editor. Reload and retry.",
          latest: err.latest,
        },
        409,
      );
    }
    if (err instanceof DuplicateNameError) {
      return json({ error: err.message }, 409);
    }
    throw err;
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
