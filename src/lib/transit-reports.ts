/**
 * "Jeep is here" reports: riders tap once when a jeep passes a stop, and recent
 * taps become "Last jeep reported 4 min ago" and, with enough of them, "About
 * every 8 min lately". Nothing here is a timetable; every line is derived from
 * real taps, and no taps means "No recent reports", never a guess.
 *
 * Pure (no `@lib/db`) so the always-on `bun run test` tier covers the
 * aggregation and the trust-boundary validation of `/api/transit/reports`.
 */
import { distanceMeters } from "./campus-route";
import { checkRateLimit } from "./api/rate-limit";
import { isValidSid } from "./presence";

/** One device may report a route at a stop (one direction) this often. */
export const REPORT_COOLDOWN_MS = 3 * 60_000;
/** Taps this close together are the same jeep seen by several riders. */
export const SAME_JEEP_MS = 60_000;
/** How far back reports count at all ("No recent reports" past this). */
export const REPORT_WINDOW_MS = 60 * 60_000;
/** Distinct jeeps needed before a frequency is worth quoting (3 gaps). */
export const MIN_JEEPS_FOR_FREQUENCY = 4;
/** "It was full" reports that make a stop read as busy. */
export const FULL_REPORTS_FOR_BUSY = 3;
export const FULL_REPORT_WINDOW_MS = 20 * 60_000;
/** A reporter who shares a location farther than this is not at the stop. */
export const MAX_REPORT_DISTANCE_M = 400;
/** A report's stop key must sit this close to a real stop on the route. */
export const STOP_KEY_MATCH_M = 30;
/** Stops the stop panel may ask about in one request (one kerb, few routes). */
export const MAX_STOPS_PER_QUERY = 12;

export type ReportDirection = "forward" | "reverse";

/** A report as the API hands it out: no device id, no location. */
export type JeepReport = {
  routeId: string;
  stopKey: string;
  direction: ReportDirection | null;
  full: boolean;
  /** ISO timestamp, set by the server. */
  at: string;
};

/**
 * Stable id for a stop within a route: its position, rounded to ~1 m. Stops
 * from the bundled offline list have no database id, and reports only matter
 * for an hour, so an editor moving a stop just starts it fresh.
 */
export function transitStopKey(stop: { lat: number; lon: number }): string {
  return `${stop.lat.toFixed(5)},${stop.lon.toFixed(5)}`;
}

const STOP_KEY_PATTERN = /^(-?\d{1,2}\.\d{5}),(-?\d{1,3}\.\d{5})$/;

export function parseStopKey(
  key: unknown,
): { lat: number; lon: number } | null {
  if (typeof key !== "string") return null;
  const match = key.match(STOP_KEY_PATTERN);
  if (!match) return null;
  const lat = Number(match[1]);
  const lon = Number(match[2]);
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

/**
 * Collapse report times into one time per jeep: a tap within SAME_JEEP_MS of
 * the first tap of the current jeep is the same jeep. Anchored to the first
 * tap, not chained, so a steady drip of taps cannot merge into one long jeep.
 */
export function clusterJeeps(times: number[]): number[] {
  const sorted = [...times].sort((a, b) => a - b);
  const jeeps: number[] = [];
  for (const time of sorted) {
    const current = jeeps[jeeps.length - 1];
    if (current === undefined || time - current > SAME_JEEP_MS) {
      jeeps.push(time);
    }
  }
  return jeeps;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export type ReportSummary = {
  /** Epoch ms of the newest report in the window, or null for none. */
  lastAt: number | null;
  /** Distinct jeeps in the window after clustering. */
  jeeps: number;
  /** Median minutes between jeeps, or null when there is too little to say. */
  everyMinutes: number | null;
};

/**
 * Reports for one route at one stop (one direction) in the last hour. The
 * frequency drops out when the last jeep is overdue by more than twice the
 * usual gap: the pattern it describes has stopped holding.
 */
export function summarizeReports(
  reportTimes: number[],
  now: number,
): ReportSummary {
  const recent = reportTimes.filter(
    (time) => time <= now + SAME_JEEP_MS && now - time <= REPORT_WINDOW_MS,
  );
  if (recent.length === 0)
    return { lastAt: null, jeeps: 0, everyMinutes: null };

  const jeeps = clusterJeeps(recent);
  const lastAt = Math.max(...recent);
  let everyMinutes: number | null = null;
  if (jeeps.length >= MIN_JEEPS_FOR_FREQUENCY) {
    const gaps = jeeps.slice(1).map((time, i) => time - jeeps[i]!);
    const gap = median(gaps)!;
    if (now - jeeps[jeeps.length - 1]! <= 2 * gap) {
      everyMinutes = Math.max(1, Math.round(gap / 60_000));
    }
  }
  return { lastAt, jeeps: jeeps.length, everyMinutes };
}

export const NO_RECENT_REPORTS = "No recent reports";

export function lastReportText(summary: ReportSummary, now: number): string {
  if (summary.lastAt === null) return NO_RECENT_REPORTS;
  const minutes = Math.max(0, Math.floor((now - summary.lastAt) / 60_000));
  if (minutes === 0) return "Last jeep reported just now";
  return `Last jeep reported ${minutes} min ago`;
}

export function frequencyText(summary: ReportSummary): string | null {
  return summary.everyMinutes === null
    ? null
    : `About every ${summary.everyMinutes} min lately`;
}

/** Report times (epoch ms) for one route + stop + direction. */
export function reportTimesFor(
  reports: JeepReport[],
  routeId: string,
  stopKey: string,
  direction: ReportDirection | null,
): number[] {
  return reports
    .filter(
      (r) =>
        r.routeId === routeId &&
        r.stopKey === stopKey &&
        (direction === null || r.direction === direction),
    )
    .map((r) => Date.parse(r.at))
    .filter(Number.isFinite);
}

/** "It was full" reports in the last FULL_REPORT_WINDOW_MS, any route. */
export function recentFullReports(reports: JeepReport[], now: number): number {
  return reports.filter((r) => {
    if (!r.full) return false;
    const at = Date.parse(r.at);
    return now - at <= FULL_REPORT_WINDOW_MS && at <= now + SAME_JEEP_MS;
  }).length;
}

export type RouteReportLine = {
  /** "Last jeep reported 4 min ago at Main Library" or NO_RECENT_REPORTS. */
  last: string;
  /** "About every 8 min lately at Main Library", or null. */
  frequency: string | null;
};

/**
 * One line for the route page: the newest report anywhere on the route, plus
 * the frequency at whichever stop has the most jeeps reported. Gaps are only
 * ever measured at a single stop; mixing stops would time the route, not a
 * jeep's headway.
 */
export function routeReportLine(
  reports: JeepReport[],
  stops: { name: string; lat: number; lon: number }[],
  now: number,
): RouteReportLine {
  const stopName = new Map(stops.map((s) => [transitStopKey(s), s.name]));
  const groups = new Map<string, { stopKey: string; times: number[] }>();
  for (const report of reports) {
    if (!stopName.has(report.stopKey)) continue;
    const at = Date.parse(report.at);
    if (!Number.isFinite(at)) continue;
    const key = `${report.stopKey}|${report.direction ?? ""}`;
    const group = groups.get(key) ?? { stopKey: report.stopKey, times: [] };
    group.times.push(at);
    groups.set(key, group);
  }

  let newest: { at: number; stopKey: string } | null = null;
  let busiest: { summary: ReportSummary; stopKey: string } | null = null;
  for (const { stopKey, times } of groups.values()) {
    const summary = summarizeReports(times, now);
    if (summary.lastAt !== null && (!newest || summary.lastAt > newest.at)) {
      newest = { at: summary.lastAt, stopKey };
    }
    if (
      summary.everyMinutes !== null &&
      (!busiest || summary.jeeps > busiest.summary.jeeps)
    ) {
      busiest = { summary, stopKey };
    }
  }

  if (!newest) return { last: NO_RECENT_REPORTS, frequency: null };
  const last = lastReportText(
    { lastAt: newest.at, jeeps: 1, everyMinutes: null },
    now,
  );
  return {
    last: `${last} at ${stopName.get(newest.stopKey)}`,
    frequency: busiest
      ? `${frequencyText(busiest.summary)} at ${stopName.get(busiest.stopKey)}`
      : null,
  };
}

// --- POST validation ------------------------------------------------------

const ROUTE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

export function isRouteId(value: unknown): value is string {
  return typeof value === "string" && ROUTE_ID_PATTERN.test(value);
}

export type ReportSubmission = {
  routeId: string;
  stopKey: string;
  direction: ReportDirection | null;
  deviceId: string;
  full: boolean;
  /** Only when the client chose to send it; used for the distance check. */
  location: { lat: number; lon: number } | null;
};

export type ReportValidation =
  | { ok: true; value: ReportSubmission }
  | { ok: false; error: string };

function isCoordinate(value: unknown, limit: number): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Math.abs(value) <= limit
  );
}

export function validateReport(body: unknown): ReportValidation {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Invalid report." };
  }
  const raw = body as {
    routeId?: unknown;
    stopKey?: unknown;
    direction?: unknown;
    deviceId?: unknown;
    full?: unknown;
    lat?: unknown;
    lon?: unknown;
  };
  if (!isRouteId(raw.routeId)) {
    return { ok: false, error: "Unknown route." };
  }
  if (!parseStopKey(raw.stopKey)) {
    return { ok: false, error: "Unknown stop." };
  }
  const direction = raw.direction ?? null;
  if (
    direction !== null &&
    direction !== "forward" &&
    direction !== "reverse"
  ) {
    return { ok: false, error: "Unknown direction." };
  }
  if (!isValidSid(raw.deviceId)) {
    return { ok: false, error: "Missing device id." };
  }
  if (raw.full !== undefined && typeof raw.full !== "boolean") {
    return { ok: false, error: "Invalid report." };
  }
  // Location is optional; a half or malformed one is dropped, not an error.
  const location =
    isCoordinate(raw.lat, 90) && isCoordinate(raw.lon, 180)
      ? { lat: raw.lat, lon: raw.lon }
      : null;
  return {
    ok: true,
    value: {
      routeId: raw.routeId,
      stopKey: raw.stopKey as string,
      direction,
      deviceId: raw.deviceId,
      full: raw.full === true,
      location,
    },
  };
}

/** True when the reporter shared a location and it is not near the stop. */
export function isReportTooFar(
  stopKey: string,
  location: { lat: number; lon: number } | null,
): boolean {
  const stop = parseStopKey(stopKey);
  if (!stop || !location) return false;
  return distanceMeters(stop, location) > MAX_REPORT_DISTANCE_M;
}

/**
 * Whether `stopKey` is a stop on `route`, and the direction fits the route:
 * two-way routes need one, one-way routes must not send one.
 */
export function reportMatchesRoute(
  route: { stops: { lat: number; lon: number }[] },
  twoWay: boolean,
  submission: Pick<ReportSubmission, "stopKey" | "direction">,
): boolean {
  const at = parseStopKey(submission.stopKey);
  if (!at) return false;
  if (twoWay !== (submission.direction !== null)) return false;
  return route.stops.some(
    (stop) => distanceMeters(stop, at) <= STOP_KEY_MATCH_M,
  );
}

export type CooldownDecision = "insert" | "mark-full" | "reject";

/**
 * This device's newest report for the same route, stop and direction decides
 * what a new tap does. Inside the cooldown a plain tap is a duplicate, but
 * "It was full" right after "Jeep is here" is the same jeep, so it marks that
 * report full instead of being refused.
 */
export function cooldownDecision(
  previous: { at: number; full: boolean } | null,
  wantsFull: boolean,
  now: number,
): CooldownDecision {
  if (!previous || now - previous.at >= REPORT_COOLDOWN_MS) return "insert";
  return wantsFull && !previous.full ? "mark-full" : "reject";
}

/** Parse `?stop=a&stop=b` into valid, de-duplicated keys (capped). */
export function parseStopKeysParam(values: string[]): string[] | null {
  const keys = [...new Set(values)].filter((v) => parseStopKey(v));
  if (keys.length === 0 || keys.length !== new Set(values).size) return null;
  return keys.length > MAX_STOPS_PER_QUERY ? null : keys;
}

// --- IP rate limit --------------------------------------------------------

/**
 * Device ids are free to mint, so the IP caps how fast one client can tap.
 * Generous on purpose: a whole campus Wi-Fi network can share one address.
 */
export const REPORT_IP_MAX = 30;
export const REPORT_IP_WINDOW_MS = 10 * 60_000;

/** The IP keys an in-memory bucket only; it is never stored. */
export function enforceReportIpLimit(
  ip: string,
  now = Date.now(),
): { allowed: false; resetAt: number } | null {
  // Same E2E escape hatch the feedback and proposal limiters use.
  const env = process.env as { ASTRO_E2E_SKIP_LOGIN_RATE_LIMIT?: string };
  if (env.ASTRO_E2E_SKIP_LOGIN_RATE_LIMIT === "1") return null;
  const result = checkRateLimit(
    `transit-report:ip:${ip}`,
    REPORT_IP_MAX,
    REPORT_IP_WINDOW_MS,
    now,
  );
  return result.allowed ? null : { allowed: false, resetAt: result.resetAt };
}
