import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import { listAuditLog } from "@lib/services/audit-log-service";
import { isMissingSchemaError } from "@lib/server/missing-schema";

export const prerender = false;

/** Admin-only audit trail, newest first: `?before=<id>` for the next page. */
export const GET: APIRoute = async ({ cookies, url }) => {
  const auth = await editorSessionOrUnauthorized(cookies, {
    requireAdmin: true,
  });
  if (auth instanceof Response) return auth;

  const before = Number(url.searchParams.get("before"));
  try {
    const page = await listAuditLog({
      before: Number.isInteger(before) && before > 0 ? before : null,
    });
    return json(page);
  } catch (error) {
    if (isMissingSchemaError(error))
      return json({ entries: [], nextBefore: null });
    console.error("Audit log read failed:", error);
    return json({ error: "Could not load the audit log." }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
    },
  });
}
