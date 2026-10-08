/**
 * Class-change peaks near a jeep stop, for the stop panel's "Likely busy"
 * estimate. Derived from the default term's class schedules in buildings
 * within NEARBY_BUILDING_M; the client decides what "now" means.
 */
import type { APIRoute } from "astro";
import { cachedJson, errorResponse } from "@lib/api/json";
import {
  checkRateLimit,
  clientIp,
  rateLimitResponse,
} from "@lib/api/rate-limit";
import { getStopPeaks } from "@lib/services/transit-report-service";
import { parseStopKey } from "@lib/transit-reports";

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  const limited = checkRateLimit(
    `read:stop-peaks:${clientIp(request)}`,
    120,
    60_000,
  );
  if (!limited.allowed) return rateLimitResponse(limited.resetAt);

  const stop = parseStopKey(url.searchParams.get("stop"));
  if (!stop) return errorResponse("Invalid stop.", 400);

  try {
    return cachedJson(await getStopPeaks(stop));
  } catch (error) {
    console.error("[stop-peaks] failed:", error);
    return errorResponse("Class schedules are unavailable right now.", 503);
  }
};
