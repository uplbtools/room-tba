import type { APIRoute } from "astro";
import { and, desc, eq } from "drizzle-orm";
import { editorHistoryTable } from "@drizzle/schema";
import { db } from "@lib/db";
import { parseEntityAttributionRequest } from "@lib/editor/entity-attribution";

export const prerender = false;

export const GET = (async ({ url }) => {
  const parsed = parseEntityAttributionRequest(url.searchParams);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: parsed.status });
  }

  const [row] = await db
    .select({
      editedBy: editorHistoryTable.editedBy,
      createdAt: editorHistoryTable.createdAt,
    })
    .from(editorHistoryTable)
    .where(
      and(
        eq(editorHistoryTable.entityType, parsed.entityType),
        eq(editorHistoryTable.entityId, parsed.entityId),
      ),
    )
    .orderBy(desc(editorHistoryTable.createdAt), desc(editorHistoryTable.id))
    .limit(1);

  return Response.json({
    attribution: row ?? null,
  });
}) satisfies APIRoute;
