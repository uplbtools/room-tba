import type { APIRoute } from "astro";
import { parseEntityAttributionRequest } from "@lib/editor/entity-attribution";
import { getPublicEntityHistory } from "@lib/services/history-service";

export const prerender = false;

/** Public, read-only edit history. Admin restore lives at /api/admin/history. */
export const GET = (async ({ url }) => {
  const parsed = parseEntityAttributionRequest(url.searchParams);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: parsed.status });
  }
  const offset = Math.max(
    0,
    Math.floor(Number(url.searchParams.get("offset")) || 0),
  );

  try {
    return Response.json(
      await getPublicEntityHistory(parsed.entityType, parsed.entityId, offset),
    );
  } catch (error) {
    console.error("Could not load public entity history:", error);
    return Response.json(
      { error: "Could not load edit history." },
      { status: 500 },
    );
  }
}) satisfies APIRoute;
