/**
 * Get Directions "Show on map" framing.
 *
 * Horizontal priority: GPS accuracy ring kisses one side of the free map
 * strip; destination name tag kisses the other — for any destination bearing.
 * Zoom is driven by width (not the tall route bbox), so diagonal walks do not
 * leave empty side gutters.
 */

export type FitPadding = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type RectLike = {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
};

export type FitLngLat = { lng: number; lat: number };

export type DirectionsFitExtents = {
  west: number;
  east: number;
  south: number;
  north: number;
  /** Destination lies east of origin (label pads the right edge). */
  destOnRight: boolean;
};

const METERS_PER_DEG_LAT = 111_320;

function lngPadForMeters(meters: number, lat: number): number {
  return (
    meters /
    (METERS_PER_DEG_LAT * Math.max(0.2, Math.cos((lat * Math.PI) / 180)))
  );
}

/** Rough half-width of a MapEntityPin label (centered on the pin). */
export function estimateDestinationLabelHalfWidthPx(label: string): number {
  const textPx = Math.min(
    11 * 16,
    Math.max(48, label.trim().length * 7.2 + 24),
  );
  return Math.ceil(textPx / 2);
}

/**
 * Geographic box for origin (GPS + accuracy) ↔ destination (+ waypoints).
 * Does not include the full walk polyline — that tall bbox was zooming out
 * for height and leaving empty horizontal space.
 */
export function computeDirectionsFitExtents(opts: {
  origin: FitLngLat;
  destination: FitLngLat;
  waypoints?: FitLngLat[];
  accuracyMeters?: number | null;
}): DirectionsFitExtents {
  const { origin, destination, waypoints = [] } = opts;
  const destOnRight = destination.lng >= origin.lng;

  let west = Math.min(origin.lng, destination.lng);
  let east = Math.max(origin.lng, destination.lng);
  let south = Math.min(origin.lat, destination.lat);
  let north = Math.max(origin.lat, destination.lat);

  for (const stop of waypoints) {
    west = Math.min(west, stop.lng);
    east = Math.max(east, stop.lng);
    south = Math.min(south, stop.lat);
    north = Math.max(north, stop.lat);
  }

  const accuracy = opts.accuracyMeters;
  if (accuracy != null && Number.isFinite(accuracy) && accuracy > 0) {
    const latPad = accuracy / METERS_PER_DEG_LAT;
    const lngPad = lngPadForMeters(accuracy, origin.lat);
    west = Math.min(west, origin.lng - lngPad);
    east = Math.max(east, origin.lng + lngPad);
    south = Math.min(south, origin.lat - latPad);
    north = Math.max(north, origin.lat + latPad);
  }

  const latSpan = Math.max(north - south, 1e-6);
  const latMargin = latSpan * 0.04;
  south -= latMargin;
  north += latMargin;

  const minLngSpan = 0.00015;
  if (east - west < minLngSpan) {
    const mid = (west + east) / 2;
    west = mid - minLngSpan / 2;
    east = mid + minLngSpan / 2;
  }

  return { west, east, south, north, destOnRight };
}

/** @deprecated Prefer computeDirectionsFitExtents — kept for older call sites. */
export function expandRouteBounds(
  minLng: number,
  minLat: number,
  maxLng: number,
  maxLat: number,
  opts?: {
    accuracyMeters?: number | null;
    gps?: [number, number] | null;
    marginRatio?: number;
  },
): [[number, number], [number, number]] {
  const gps = opts?.gps;
  const origin = gps
    ? { lng: gps[0], lat: gps[1] }
    : { lng: minLng, lat: minLat };
  const destination = { lng: maxLng, lat: maxLat };
  const e = computeDirectionsFitExtents({
    origin,
    destination,
    accuracyMeters: opts?.accuracyMeters,
  });
  return [
    [e.west, e.south],
    [e.east, e.north],
  ];
}

/**
 * Chrome covers + asymmetric label pad. Horizontal edge gutters stay tiny so
 * the accuracy ring / name tag can sit on the screen edges.
 */
export function directionsFitPaddingFromRects(
  mapRect: RectLike,
  chrome: {
    topBottom: number;
    coverBottom: number;
    leftCover?: number;
    mobile?: boolean;
    destinationLabelHalfWidthPx?: number;
    destOnRight?: boolean;
    edgeGutterPx?: number;
  },
): FitPadding {
  const leftCover = chrome.leftCover ?? 0;
  const edge = chrome.edgeGutterPx ?? 2;
  const labelHalf = chrome.destinationLabelHalfWidthPx ?? 56;
  const destOnRight = chrome.destOnRight ?? true;

  let topCover = Math.max(0, chrome.topBottom - mapRect.top);
  let bottomCover = Math.max(0, mapRect.bottom - chrome.coverBottom);
  let left = Math.max(0, leftCover);

  const minFreeH = 120;
  const minFreeW = 160;
  const maxTopBottom = Math.max(0, mapRect.height - minFreeH);
  if (topCover + bottomCover > maxTopBottom) {
    const scale = maxTopBottom / (topCover + bottomCover || 1);
    topCover *= scale;
    bottomCover *= scale;
  }
  if (left > mapRect.width - minFreeW) {
    left = Math.max(0, mapRect.width - minFreeW);
  }

  const freeH = Math.max(0, mapRect.height - topCover - bottomCover);
  const gutterY = Math.min(24, Math.max(10, Math.round(freeH * 0.06)));

  return {
    top: Math.round(topCover + gutterY),
    bottom: Math.round(bottomCover + gutterY),
    left: Math.round(left + edge + (destOnRight ? 0 : labelHalf)),
    right: Math.round(edge + (destOnRight ? labelHalf : 0)),
  };
}

type CameraForBoundsMap = {
  cameraForBounds: (
    bounds: [[number, number], [number, number]],
    options?: {
      padding?: FitPadding;
      bearing?: number;
      pitch?: number;
      maxZoom?: number;
    },
  ) => {
    center: { lng: number; lat: number } | [number, number];
    zoom: number;
  };
};

/**
 * Width-first camera: zoom so west↔east fills the padded strip. Center sits on
 * the origin/destination midpoints (vertical chrome still applied via padding).
 */
export function directionsEdgeCamera(
  map: CameraForBoundsMap,
  extents: DirectionsFitExtents,
  padding: FitPadding,
): { center: [number, number]; zoom: number } {
  const midLat = (extents.south + extents.north) / 2;
  const midLng = (extents.west + extents.east) / 2;
  const eps = 1e-7;

  // Degenerate-height bounds → zoom is decided by width only.
  const cam = map.cameraForBounds(
    [
      [extents.west, midLat - eps],
      [extents.east, midLat + eps],
    ],
    {
      padding,
      bearing: 0,
      pitch: 0,
      maxZoom: 18,
    },
  );

  const center = cam.center;
  const lng = Array.isArray(center) ? center[0] : center.lng;
  const lat = Array.isArray(center) ? center[1] : center.lat;

  return {
    // Prefer geographic midpoint of the trip, not whatever cameraForBounds
    // picked for the flat band (keeps both pins in the vertical free strip).
    center: [midLng || lng, midLat || lat],
    zoom: cam.zoom,
  };
}
