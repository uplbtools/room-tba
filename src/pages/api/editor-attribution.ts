import type { APIRoute } from "astro";
import { parseEntityAttributionRequest } from "@lib/editor/entity-attribution";
import { getEntityAttribution } from "@lib/services/history-service";

export const prerender = false;

export const GET = (async ({ url }) => {
  const parsed = parseEntityAttributionRequest(url.searchParams);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: parsed.status });
  }

  try {
    return Response.json({
      attribution: await getEntityAttribution(
        parsed.entityType,
        parsed.entityId,
      ),
    });
  } catch (error) {
    console.error("Could not load entity attribution:", error);
    return Response.json({ attribution: null });
  }
}) satisfies APIRoute;
