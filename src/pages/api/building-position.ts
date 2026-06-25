import type { APIRoute } from "astro";
import type { AstroCookies } from "astro";
import { eq } from "drizzle-orm";
import { db } from "../../lib/db";
import { buildingsTable } from "../../../drizzle/schema";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "../../lib/admin/auth";
import { refreshSyncKey } from "../../lib/services/admin-service";

export const prerender = false;

function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function jsonOk<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function isAdmin(cookies: AstroCookies): boolean {
  return verifySessionToken(cookies.get(ADMIN_COOKIE_NAME)?.value);
}

export const PUT: APIRoute = async ({ request, cookies, url }) => {
  if (!isAdmin(cookies)) return jsonError(401, "Not authorized");

  const buildingName = url.searchParams.get("building");
  if (!buildingName) {
    return jsonError(400, "Missing required ?building= query param");
  }

  let body: { lon?: number; lat?: number };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const { lon, lat } = body;
  if (
    typeof lon !== "number" ||
    typeof lat !== "number" ||
    !Number.isFinite(lon) ||
    !Number.isFinite(lat)
  ) {
    return jsonError(400, "Body must contain { lon: number, lat: number }");
  }

  // Validate coordinates are within campus bounds (with some margin)
  const minLng = 121.2;
  const maxLng = 121.3;
  const minLat = 14.1;
  const maxLat = 14.2;

  if (lon < minLng || lon > maxLng || lat < minLat || lat > maxLat) {
    return jsonError(400, "Coordinates are outside campus bounds");
  }

  try {
    await db
      .update(buildingsTable)
      .set({ lon, lat })
      .where(eq(buildingsTable.buildingName, buildingName));
    await refreshSyncKey("buildings");

    return jsonOk({ success: true, lon, lat });
  } catch (error) {
    return jsonError(500, "Failed to update building position");
  }
};
