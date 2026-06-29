import type { APIRoute } from "astro";
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
    return new Response(
      JSON.stringify({ error: "Missing entity filter", success: false }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!Number.isFinite(id)) {
    return new Response(
      JSON.stringify({ error: "Invalid entity id", success: false }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
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
    return new Response(JSON.stringify({ data, success: true }, null, 2), {
      headers: [
        ["Access-Control-Allow-Origin", "*"],
        ["Content-Type", "application/json"],
      ],
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "Failed to fetch class counts", success: false }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}) satisfies APIRoute;
