import { slugifySegment } from "./site";
import { absoluteUrl } from "./site";

/**
 * Shareable walking routes live at /route/<from>/<to>.
 *
 * Both endpoints sit in the pathname rather than a query string on purpose:
 * Vercel ISR keys its cache on pathname only, so ?from=&to= variants would all
 * collapse into one cached page and every pair would serve the first route
 * rendered (the same trap that hit /og.png in #651).
 */
export const ROUTE_PATH_PREFIX = "/route";

export function getRoutePath(fromName: string, toName: string): string {
  return `${ROUTE_PATH_PREFIX}/${slugifySegment(fromName)}/${slugifySegment(toName)}/`;
}

export function getRouteShareUrl(fromName: string, toName: string): string {
  return absoluteUrl(getRoutePath(fromName, toName));
}

type NamedPoint = { lat: number | null; lon: number | null };

/**
 * Resolves a route slug against loaded campus data. Returns [lon, lat], the
 * order MapLibre and the directions control expect, not the lat/lon order the
 * database columns are written in.
 */
export function findCampusPointBySlug(
  data: {
    buildings?: ({ buildingName: string } & NamedPoint)[] | null;
    dorms?: ({ dormName: string } & NamedPoint)[] | null;
    places?: ({ name: string } & NamedPoint)[] | null;
  },
  slug: string,
): [number, number] | null {
  const candidates: { name: string; lat: number | null; lon: number | null }[] =
    [
      ...(data.buildings ?? []).map((b) => ({
        name: b.buildingName,
        lat: b.lat,
        lon: b.lon,
      })),
      ...(data.dorms ?? []).map((d) => ({
        name: d.dormName,
        lat: d.lat,
        lon: d.lon,
      })),
      ...(data.places ?? []).map((p) => ({
        name: p.name,
        lat: p.lat,
        lon: p.lon,
      })),
    ];

  for (const candidate of candidates) {
    if (candidate.lat === null || candidate.lon === null) continue;
    if (slugifySegment(candidate.name) === slug) {
      return [candidate.lon, candidate.lat];
    }
  }
  return null;
}

export type ParsedRoutePath = { fromSlug: string; toSlug: string };

export function parseRoutePathname(pathname: string): ParsedRoutePath | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length !== 3 || segments[0] !== "route") return null;
  const [, fromSlug, toSlug] = segments;
  if (!fromSlug || !toSlug) return null;
  return { fromSlug, toSlug };
}
