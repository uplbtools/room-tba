import type { APIRoute } from "astro";
import { getEditorSession } from "@lib/admin/require-editor";
import { db } from "@lib/db";
import { editProposalsTable } from "@drizzle/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { withEntityLabel } from "@lib/services/proposal-service";

export const prerender = false;

const OPEN_STATUSES = ["pending", "needs_changes"] as const;

export const GET: APIRoute = async ({ cookies }) => {
  const session = getEditorSession(cookies);
  if (!session) {
    return json({ error: "Sign in required." }, 401);
  }

  const rows = await db
    .select()
    .from(editProposalsTable)
    .where(
      and(
        eq(editProposalsTable.submitterUserId, session.id),
        inArray(editProposalsTable.status, [...OPEN_STATUSES]),
      ),
    )
    .orderBy(desc(editProposalsTable.updatedAt));

  const proposals = await Promise.all(rows.map((row) => withEntityLabel(row)));
  return json({ proposals });
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
