import type { APIRoute } from "astro";
import { updateBuilding } from "../../../../lib/services/admin-service";

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request }) => {
  const id = parseInt(params["id"] ?? "");
  if (isNaN(id)) {
    return new Response(JSON.stringify({ error: "Invalid building ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { buildingName, lat, lon, buildingType, directions } = body as {
    buildingName?: string;
    lat?: number;
    lon?: number;
    buildingType?: "admin" | "non-admin";
    directions?: string;
  };

  if (!buildingName || buildingName.trim().length === 0) {
    return new Response(JSON.stringify({ error: "Building name is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (typeof lat !== "number" || typeof lon !== "number") {
    return new Response(JSON.stringify({ error: "Valid lat and lon are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (buildingType && !["admin", "non-admin"].includes(buildingType)) {
    return new Response(JSON.stringify({ error: "Invalid building type" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await updateBuilding(id, {
      buildingName: buildingName.trim(),
      lat,
      lon,
      buildingType: buildingType ?? "non-admin",
      directions: directions ?? "",
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Failed to update building:", err);
    return new Response(JSON.stringify({ error: "Failed to save building" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
