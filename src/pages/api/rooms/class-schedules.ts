import type { APIRoute } from "astro";
import { cachedJson, json } from "@lib/api/json";
import { getBuildingClassSchedules } from "@lib/services/map-data-service";

export const prerender = false;

/** Every class schedule in one building: the building sheet's "classes now". */
export const GET = (async ({ url }) => {
  const buildingId = Number(url.searchParams.get("building_id"));
  const termIdRaw = url.searchParams.get("term_id");
  const termId =
    termIdRaw !== null && termIdRaw !== "" ? Number(termIdRaw) : undefined;

  if (!Number.isInteger(buildingId) || buildingId < 1) {
    return json({ error: "Invalid building_id", success: false }, 400);
  }
  if (termId !== undefined && !Number.isFinite(termId)) {
    return json({ error: "Invalid term_id", success: false }, 400);
  }

  try {
    const data = await getBuildingClassSchedules(buildingId, termId);
    return cachedJson({ data, success: true }, 200, {
      "Access-Control-Allow-Origin": "*",
    });
  } catch {
    return json(
      { error: "Failed to fetch class schedules", success: false },
      500,
    );
  }
}) satisfies APIRoute;
