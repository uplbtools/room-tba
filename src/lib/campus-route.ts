/**
 * Walking routes across campus, from the same OSRM foot service the map's
 * directions control already uses (Map.svelte).
 *
 * OSRM returns empty `name` on almost every campus path, because the footpaths
 * in OSM are unnamed. Turn-by-turn built from it alone reads "turn right onto
 * ''", which is worse than nothing. So each turn is labelled with the nearest
 * named thing we already have coordinates for, which is the one description
 * advantage this app has over a general map.
 */

export const OSRM_FOOT_API =
  "https://routing.openstreetmap.de/routed-foot/route/v1";

/** Anything on campus we can name and have a position for. */
export type RoutePlace = {
  name: string;
  lat: number;
  lon: number;
};

export type RouteStep = {
  /** OSRM maneuver, e.g. "turn", "depart", "arrive". */
  maneuver: string;
  /** "left" | "right" | "straight" and friends. Absent on depart/arrive. */
  modifier: string | null;
  meters: number;
  /** Nearest named campus feature to this turn, when one is close enough. */
  landmark: string | null;
};

export type CampusRoute = {
  meters: number;
  seconds: number;
  steps: RouteStep[];
  /** [lon, lat] pairs, for drawing or handing to a description. */
  coordinates: [number, number][];
};

/**
 * Metres between two points. Equirectangular rather than haversine: campus is
 * about 2 km across, where the error is centimetres, and this runs per step
 * per landmark candidate.
 */
export function distanceMeters(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const metersPerDegree = 111_320;
  const meanLat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const dx = (b.lon - a.lon) * Math.cos(meanLat) * metersPerDegree;
  const dy = (b.lat - a.lat) * metersPerDegree;
  return Math.hypot(dx, dy);
}

/** Past this, naming a landmark misleads more than it helps. */
const LANDMARK_RADIUS_M = 120;

export function nearestPlace(
  point: { lat: number; lon: number },
  places: RoutePlace[],
  withinMeters = LANDMARK_RADIUS_M,
): RoutePlace | null {
  let best: RoutePlace | null = null;
  let bestDistance = withinMeters;
  for (const place of places) {
    const distance = distanceMeters(point, place);
    if (distance < bestDistance) {
      best = place;
      bestDistance = distance;
    }
  }
  return best;
}

type OsrmStep = {
  distance: number;
  maneuver?: { type?: string; modifier?: string; location?: [number, number] };
};

type OsrmResponse = {
  code?: string;
  routes?: {
    distance: number;
    duration: number;
    geometry?: { coordinates?: [number, number][] };
    legs?: { steps?: OsrmStep[] }[];
  }[];
};

export function toCampusRoute(
  payload: OsrmResponse,
  landmarks: RoutePlace[],
): CampusRoute | null {
  const route = payload.routes?.[0];
  if (payload.code !== "Ok" || !route) return null;

  const steps: RouteStep[] = [];
  for (const leg of route.legs ?? []) {
    for (const step of leg.steps ?? []) {
      const location = step.maneuver?.location;
      steps.push({
        maneuver: step.maneuver?.type ?? "continue",
        modifier: step.maneuver?.modifier ?? null,
        meters: Math.round(step.distance),
        landmark: location
          ? (nearestPlace({ lon: location[0], lat: location[1] }, landmarks)
              ?.name ?? null)
          : null,
      });
    }
  }

  return {
    meters: Math.round(route.distance),
    seconds: Math.round(route.duration),
    steps,
    coordinates: route.geometry?.coordinates ?? [],
  };
}

export async function fetchCampusRoute(
  from: RoutePlace,
  to: RoutePlace,
  landmarks: RoutePlace[],
  fetchImpl: typeof fetch = fetch,
): Promise<CampusRoute | null> {
  const coords = `${from.lon},${from.lat};${to.lon},${to.lat}`;
  const url = `${OSRM_FOOT_API}/foot/${coords}?overview=simplified&steps=true&geometries=geojson`;
  try {
    const response = await fetchImpl(url, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    return toCampusRoute((await response.json()) as OsrmResponse, landmarks);
  } catch {
    // Public OSRM instance: treat any outage as "no route", never a 500.
    return null;
  }
}

export type RouteTotals = {
  meters: number;
  seconds: number;
};

/**
 * Total walking distance/time across OSRM route legs (a day route has one leg
 * per stop-to-stop hop). Legs come from the map's directions response, whose
 * types leave distance/duration untyped, so non-numeric legs are skipped;
 * null when nothing summable remains.
 */
export function sumRouteLegs(
  legs: readonly { distance?: unknown; duration?: unknown }[],
): RouteTotals | null {
  let meters = 0;
  let seconds = 0;
  let counted = false;
  for (const leg of legs) {
    if (typeof leg.distance === "number" && typeof leg.duration === "number") {
      meters += leg.distance;
      seconds += leg.duration;
      counted = true;
    }
  }
  return counted
    ? { meters: Math.round(meters), seconds: Math.round(seconds) }
    : null;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

export function formatDistance(meters: number): string {
  return meters < 1000
    ? `${Math.round(meters / 10) * 10} m`
    : `${(meters / 1000).toFixed(1)} km`;
}
