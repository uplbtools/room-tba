/**
 * Google Street View URL builders and coverage lookup.
 *
 * ## Read this before storing anything
 *
 * The Google Maps Platform terms permit only limited temporary caching of
 * imagery. They do not permit building a permanent photo library out of it.
 * So Street View can be *rendered* next to a building, but its bytes must not
 * be written into `photos` or any other table, and must not be re-hosted on
 * our own CDN. Anything that wants owned, storable imagery needs a different
 * source (Mapillary is CC-BY-SA and permits it, as do contributor uploads).
 *
 * This module therefore only ever produces URLs the browser fetches directly,
 * plus a metadata lookup. Nothing here downloads an image.
 *
 * ## Check coverage before you spend anything
 *
 * `fetchStreetViewMetadata` hits the metadata endpoint, which is free and
 * unmetered. It answers "is there imagery here at all" without requesting a
 * billable image. Always gate an image request on it: without the check,
 * Google bills for a request that returns its grey "no imagery" placeholder.
 *
 * UPLB coverage measured 2026-08-05 was 52/52 buildings within 100m, so on
 * this campus the check will usually pass. It still has to run, both because
 * coverage is not guaranteed for new pins and because the response carries the
 * capture date, which is worth showing next to a photo that may be a decade
 * old (campus imagery here ranges from 2015 to 2026).
 */

const STATIC_ENDPOINT = "https://maps.googleapis.com/maps/api/streetview";
const METADATA_ENDPOINT = `${STATIC_ENDPOINT}/metadata`;

/** Largest the free/static endpoint serves without a signed premium request. */
const MAX_SIZE = 640;

export type StreetViewCoords = { lat: number; lng: number };

export type StreetViewImageOptions = {
  /** Pixels. Clamped to 640, the static endpoint's ceiling. */
  width?: number;
  height?: number;
  /** Compass heading in degrees. Omit to let Google point at the subject. */
  heading?: number;
  /** Up/down angle, -90 to 90. */
  pitch?: number;
  /** Horizontal field of view in degrees, 10 to 120. Lower zooms in. */
  fov?: number;
  /**
   * How far from the coordinates Google may look for a panorama, in metres.
   * Campus buildings sit well back from the road, so the default 50 often
   * finds nothing where 100 finds the frontage.
   */
  radius?: number;
};

export type StreetViewMetadata =
  | { status: "OK"; panoId: string; location: StreetViewCoords; date?: string }
  | { status: "ZERO_RESULTS" | "NOT_FOUND" }
  | { status: "ERROR"; reason: string };

/** Feature is off until a key exists, rather than rendering broken images. */
export function hasStreetViewKey(key: string | undefined): key is string {
  return typeof key === "string" && key.trim().length > 8;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Build a Street View Static image URL.
 *
 * Callers must have confirmed coverage with `fetchStreetViewMetadata` first.
 * Without that check Google bills for a request that returns its grey "no
 * imagery" placeholder, which is a charge for nothing.
 */
export function streetViewImageUrl(
  coords: StreetViewCoords,
  key: string,
  options: StreetViewImageOptions = {},
): string {
  const width = clamp(Math.round(options.width ?? 640), 16, MAX_SIZE);
  const height = clamp(Math.round(options.height ?? 400), 16, MAX_SIZE);
  const params = new URLSearchParams({
    size: `${width}x${height}`,
    location: `${coords.lat},${coords.lng}`,
    key,
  });
  if (options.heading !== undefined)
    params.set("heading", String(Math.round(options.heading)));
  if (options.pitch !== undefined)
    params.set("pitch", String(clamp(Math.round(options.pitch), -90, 90)));
  if (options.fov !== undefined)
    params.set("fov", String(clamp(Math.round(options.fov), 10, 120)));
  if (options.radius !== undefined)
    params.set("radius", String(Math.max(1, Math.round(options.radius))));
  return `${STATIC_ENDPOINT}?${params.toString()}`;
}

export function streetViewMetadataUrl(
  coords: StreetViewCoords,
  key: string,
  radius?: number,
): string {
  const params = new URLSearchParams({
    location: `${coords.lat},${coords.lng}`,
    key,
  });
  if (radius !== undefined)
    params.set("radius", String(Math.max(1, Math.round(radius))));
  return `${METADATA_ENDPOINT}?${params.toString()}`;
}

/**
 * Ask whether imagery exists near these coordinates. Free and unmetered.
 *
 * Never throws: a coverage check failing is not a reason to break a building
 * panel, so transport and parse failures come back as `status: "ERROR"` and
 * the caller renders nothing.
 */
export async function fetchStreetViewMetadata(
  coords: StreetViewCoords,
  key: string,
  options: { radius?: number; fetchImpl?: typeof fetch } = {},
): Promise<StreetViewMetadata> {
  const doFetch = options.fetchImpl ?? fetch;
  try {
    const res = await doFetch(
      streetViewMetadataUrl(coords, key, options.radius),
    );
    if (!res.ok) return { status: "ERROR", reason: `HTTP ${res.status}` };
    const body = (await res.json()) as {
      status?: string;
      pano_id?: string;
      location?: { lat?: number; lng?: number };
      date?: string;
      error_message?: string;
    };
    if (body.status === "OK" && body.pano_id) {
      return {
        status: "OK",
        panoId: body.pano_id,
        location: {
          lat: body.location?.lat ?? coords.lat,
          lng: body.location?.lng ?? coords.lng,
        },
        date: body.date,
      };
    }
    if (body.status === "ZERO_RESULTS" || body.status === "NOT_FOUND") {
      return { status: body.status };
    }
    return {
      status: "ERROR",
      reason: body.error_message ?? body.status ?? "unknown response",
    };
  } catch (error) {
    return {
      status: "ERROR",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Attribution is required wherever Street View imagery is shown. The static
 * endpoint burns a Google logo into the image, but the terms still expect the
 * surrounding UI to credit the source, so callers render this next to it.
 */
export const STREET_VIEW_ATTRIBUTION = "Street View image © Google";
