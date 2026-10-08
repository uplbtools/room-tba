/**
 * "Jeep is here" reports (see `@lib/transit-reports`).
 *
 * POST is an anonymous write, so it is a trust boundary: IP rate limit, body
 * cap, validation, a check that the stop is really on the route, an optional
 * distance check, and a per-device cooldown, all before anything is stored.
 * GET hands out the last hour of reports with no device ids.
 */
import type { APIRoute } from "astro";
import {
  checkRateLimit,
  clientIp,
  rateLimitResponse,
} from "@lib/api/rate-limit";
import {
  getRouteReports,
  getStopReports,
  recordJeepReport,
} from "@lib/services/transit-report-service";
import { getTransitRouteForPage } from "@lib/services/transit-service";
import { routeDirections } from "@lib/transit-direction";
import {
  enforceReportIpLimit,
  isReportTooFar,
  isRouteId,
  isUndefinedTableError,
  parseStopKeysParam,
  reportMatchesRoute,
  validateReport,
} from "@lib/transit-reports";

export const prerender = false;

const MAX_BODY_BYTES = 2048;

function json(body: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      // Live data: a shared cache would freeze "4 min ago" for everyone.
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const denied = enforceReportIpLimit(clientIp(request));
  if (denied) {
    return rateLimitResponse(
      denied.resetAt,
      "That is a lot of reports at once. Try again in a few minutes.",
    );
  }
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return json({ error: "Report is too large." }, 413);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const validated = validateReport(body);
  if (!validated.ok) return json({ error: validated.error }, 400);
  const report = validated.value;

  if (isReportTooFar(report.stopKey, report.location)) {
    return json(
      { error: "You seem to be away from this stop. Report from the stop." },
      422,
    );
  }

  try {
    const route = await getTransitRouteForPage(report.routeId);
    if (!route) return json({ error: "Unknown route." }, 404);
    if (
      !reportMatchesRoute(route, routeDirections(route.id) !== null, report)
    ) {
      return json({ error: "That stop is not on this route." }, 400);
    }

    const result = await recordJeepReport(report);
    if (result === "reject") {
      return json(
        { error: "You just reported this jeep. Try again in a few minutes." },
        429,
      );
    }
    return json({ ok: true, result }, result === "insert" ? 201 : 200);
  } catch (error) {
    // Missing table (migration not applied yet), pooler hiccup: say so plainly.
    console.error("[transit-reports] write failed:", error);
    return json({ error: "Reports are unavailable right now." }, 503);
  }
};

export const GET: APIRoute = async ({ request, url }) => {
  const limited = checkRateLimit(
    `read:transit-reports:${clientIp(request)}`,
    120,
    60_000,
  );
  if (!limited.allowed) return rateLimitResponse(limited.resetAt);

  const routeId = url.searchParams.get("route");
  const stopParams = url.searchParams.getAll("stop");
  const stopKeys =
    stopParams.length > 0 ? parseStopKeysParam(stopParams) : null;
  if (stopParams.length > 0 && !stopKeys) {
    return json({ error: "Invalid stop." }, 400);
  }
  if (!stopKeys && !isRouteId(routeId)) {
    return json({ error: "Pass ?stop= or ?route=." }, 400);
  }

  try {
    const reports = stopKeys
      ? await getStopReports(stopKeys)
      : await getRouteReports(routeId!);
    return json({ now: new Date().toISOString(), reports });
  } catch (error) {
    // Code can ship before migration 0054 reaches the database: no table
    // means no reports yet, which is true, not an outage.
    if (isUndefinedTableError(error)) {
      return json({ now: new Date().toISOString(), reports: [] });
    }
    console.error("[transit-reports] read failed:", error);
    return json({ error: "Reports are unavailable right now." }, 503);
  }
};
