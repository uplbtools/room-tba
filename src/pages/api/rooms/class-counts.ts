import type { APIRoute } from "astro";
import { cachedJson, json } from "@lib/api/json";
import { getRoomClassCounts } from "@lib/services/map-data-service";

export const prerender = false;

export const GET = (async ({ url }) => {
  const buildingId = url.searchParams.get("building_id");
  const collegeId = url.searchParams.get("college_id");
  const divisionId = url.searchParams.get("division_id");
  const termIdRaw = url.searchParams.get("term_id");
  const termId =
    termIdRaw !== null && termIdRaw !== "" ? Number(termIdRaw) : undefined;

  let entityName: "building" | "college" | "division";
  let id: number;
  if (buildingId !== null) {
    entityName = "building";
    id = Number(buildingId);
  } else if (collegeId !== null) {
    entityName = "college";
    id = Number(collegeId);
  } else if (divisionId !== null) {
    entityName = "division";
    id = Number(divisionId);
  } else {
    return json({ error: "Missing entity filter", success: false }, 400);
  }

  if (!Number.isFinite(id)) {
    return json({ error: "Invalid entity id", success: false }, 400);
  }

  try {
    const counts = await getRoomClassCounts(
      entityName,
      id,
      Number.isFinite(termId) ? termId : undefined,
    );
    const data = Array.from(counts.entries()).map(([roomId, count]) => ({
      roomId,
      count,
    }));
    return cachedJson({ data, success: true }, 200, {
      "Access-Control-Allow-Origin": "*",
    });
  } catch {
    return json({ error: "Failed to fetch class counts", success: false }, 500);
  }
}) satisfies APIRoute;
