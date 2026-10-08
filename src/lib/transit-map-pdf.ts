/**
 * Printable transit map PDF for the UPLB jeepney routes.
 *
 * The frame is fitted to the campus stops and the place the map was opened
 * from, not to the full route extent: stops that fall outside it (the malls,
 * the upper Forestry campus, Pili Drive and beyond) become edge arrows. A thinned OpenStreetMap
 * layer (streets, buildings, gates) is drawn as light vector paths under the
 * routes; it is bundled at build time, so a request makes no network calls.
 *
 * Accessibility: all text is real PDF text, labels carry a white halo over
 * line work, and every route differs by dash pattern as well as color so a
 * grayscale print or a colorblind reader can still tell them apart.
 */

import {
  PDFDocument,
  StandardFonts,
  clip,
  endPath,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import {
  LOGO_PNG_BASE64,
  PRINT_MAP_QR,
  RALEWAY_BOLD_HEADINGS,
} from "@constants/print-brand";

export type TransitMapStop = { name: string; lat: number; lon: number };

export type TransitMapRoute = {
  id: string;
  name: string;
  color: string;
  fareRegular: number;
  fareDiscounted: number;
  directionNote: string | null;
  /** Where to board, printed on the route card (e.g. Forestry's terminals). */
  boardingNote?: string | null;
  stops: TransitMapStop[];
  /** Road path in travel order, when one is sourced; else stops are joined. */
  line?: { lat: number; lon: number }[];
};

/** A dropped pin or GPS fix has no name; the sheet then says "the star". */
export type TransitMapHere = { name?: string | null; lat: number; lon: number };

/** `src/constants/transit-basemap.json`: [lon, lat] ways from OpenStreetMap. */
export type TransitBasemap = {
  roadsMajor: [number, number][][];
  roadsMinor: [number, number][][];
  water: [number, number][][];
  buildings: [number, number][][];
  gates: { name: string; lat: number; lon: number }[];
};

export type TransitMapFormat = "a4" | "letter";

const PAGE_SIZES: Record<TransitMapFormat, { w: number; h: number }> = {
  a4: { w: 841.89, h: 595.28 },
  letter: { w: 792, h: 612 },
};

const BRAND = rgb(0.49, 0.179, 0.15); // hsl(5, 53%, 32%), the Room TBA maroon
const INK = rgb(0.102, 0.102, 0.102);
const MUTED = rgb(0.4, 0.4, 0.4);
const HAIRLINE = rgb(0.8, 0.8, 0.8);
const WHITE = rgb(1, 1, 1);
// Highlight on the maroon band: #FFD54F on BRAND is 6.5:1, past WCAG AA
// (4.5:1) for small text; SOFT_ON_BRAND (#F6E3E0) is 7.4:1, white 9.2:1.
const SUNNY = rgb(1, 0.835, 0.31);
const SOFT_ON_BRAND = rgb(0.965, 0.89, 0.878);
const PAPER_TINT = rgb(0.98, 0.965, 0.955);
/**
 * Print palettes. The sheet is taped to walls and photocopied, so the base
 * map stays pale and the routes carry the colour. `routes` overrides a
 * route's app colour on paper only (by route id); `loopReverse` gives a
 * loop's reverse direction (Kanan) its own hue, so it never reads as Kaliwa.
 */
export type TransitMapPalette = "app" | "high-contrast" | "colorblind";
type PaletteSpec = {
  building: RGB;
  roadMajor: RGB;
  roadMinor: RGB;
  water: RGB;
  routes: Record<string, string>;
  loopReverse: Record<string, string>;
};
export const TRANSIT_MAP_PALETTES: Record<TransitMapPalette, PaletteSpec> = {
  // The colours riders see in the app, on a lighter base map.
  app: {
    building: rgb(0.93, 0.92, 0.9),
    roadMajor: rgb(0.82, 0.82, 0.82),
    roadMinor: rgb(0.89, 0.89, 0.89),
    water: rgb(0.78, 0.87, 0.94),
    routes: {},
    loopReverse: { "kaliwa-kanan": "#7B1FA2" },
  },
  // Deeper route colours on a near-white base: survives a cheap printer.
  "high-contrast": {
    building: rgb(0.95, 0.95, 0.95),
    roadMajor: rgb(0.86, 0.86, 0.86),
    roadMinor: rgb(0.92, 0.92, 0.92),
    water: rgb(0.82, 0.9, 0.96),
    routes: {
      "kaliwa-kanan": "#B71C1C",
      forestry: "#E65100",
      "up-rural": "#0D47A1",
    },
    loopReverse: { "kaliwa-kanan": "#6A1B9A" },
  },
  // Okabe-Ito hues, distinct for the common colour-vision deficiencies.
  colorblind: {
    building: rgb(0.94, 0.94, 0.93),
    roadMajor: rgb(0.84, 0.84, 0.84),
    roadMinor: rgb(0.91, 0.91, 0.91),
    water: rgb(0.8, 0.88, 0.95),
    routes: {
      "kaliwa-kanan": "#D55E00",
      forestry: "#009E73",
      "up-rural": "#0072B2",
    },
    loopReverse: { "kaliwa-kanan": "#AA4499" },
  },
};

const MARGIN = 32;
const HEADER_H = 86;
const FOOTER_H = 30;
const PANEL_W = 222;
const PANEL_GAP = 14;

/** Straight-line distance times this is the printed walking estimate. */
export const WALK_DETOUR_FACTOR = 1.3;
/** The frame fits stops this close to the campus center; farther ones (the
 *  malls, the upper Forestry campus, Pili Drive and beyond) become edge arrows. */
const CORE_RADIUS_M = 800;
/** A place farther than this from campus is not pulled into the frame. */
const HERE_MAX_M = 3000;

/** Meters per degree of longitude at the campus latitude (~14.17 N). */
export function metersPerDegreeLon(latDeg: number): number {
  return 111320 * Math.cos((latDeg * Math.PI) / 180);
}

type LatLon = { lat: number; lon: number };

export function haversineMeters(a: LatLon, b: LatLon): number {
  const R = 6371008.8;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Reads `lat`, `lon` and an optional `name` from the query string, so any
 * point (a dropped pin, a GPS fix, any search result) can be "You are here".
 * Returns null when no point was passed and "invalid" for bad numbers.
 */
export function parseHerePoint(
  params: URLSearchParams,
): TransitMapHere | null | "invalid" {
  const latRaw = params.get("lat")?.trim();
  const lonRaw = params.get("lon")?.trim();
  if (!latRaw && !lonRaw) return null;
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  if (
    !latRaw ||
    !lonRaw ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    Math.abs(lat) > 90 ||
    Math.abs(lon) > 180
  ) {
    return "invalid";
  }
  const name =
    params
      .get("name")
      // biome-ignore lint/suspicious/noControlCharactersInRegex: strip control characters from user input
      ?.replace(/[\u0000-\u001f\u007f]/g, "")
      .trim()
      .slice(0, 80) || null;
  return { name, lat, lon };
}

/** Closest stop to `here` and the approximate walk to it (straight line x 1.3). */
export function findNearestStop<T extends LatLon>(
  here: LatLon,
  stops: T[],
): { stop: T; straightM: number; walkM: number } | null {
  let best: { stop: T; straightM: number } | null = null;
  for (const stop of stops) {
    const d = haversineMeters(here, stop);
    if (!best || d < best.straightM) best = { stop, straightM: d };
  }
  return best ? { ...best, walkM: best.straightM * WALK_DETOUR_FACTOR } : null;
}

/** "140 m", "1.3 km": rounded so the print does not imply false precision. */
export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export type ProjectedPoint = { x: number; y: number };

/**
 * Local equirectangular projection fitted to the map frame, preserving
 * aspect. Returns a projector plus the scale (pt per meter) for the scale bar.
 */
export function makeProjector(
  points: LatLon[],
  frame: { x: number; y: number; w: number; h: number },
): {
  project: (lat: number, lon: number) => ProjectedPoint;
  ptPerMeter: number;
} | null {
  if (points.length === 0) return null;
  const lat0 = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const mPerDegLon = metersPerDegreeLon(lat0);
  const xs = points.map((p) => p.lon * mPerDegLon);
  const ys = points.map((p) => p.lat * 111320);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  // 8% breathing room so edge stops/labels are not clipped by the frame.
  const padX = spanX * 0.08;
  const padY = spanY * 0.08;
  const scale = Math.min(
    frame.w / (spanX + padX * 2),
    frame.h / (spanY + padY * 2),
  );
  const offX = frame.x + (frame.w - (spanX + padX * 2) * scale) / 2;
  const offY = frame.y + (frame.h - (spanY + padY * 2) * scale) / 2;
  return {
    ptPerMeter: scale,
    project: (lat, lon) => ({
      x: offX + (lon * mPerDegLon - minX + padX) * scale,
      y: offY + (lat * 111320 - minY + padY) * scale,
    }),
  };
}

const f2 = (n: number) => Number(n.toFixed(2));

/** Straight-segment SVG path. Stops sit on the line, unlike a fitted curve. */
export function polylinePath(points: ProjectedPoint[]): string {
  if (points.length === 0) return "";
  return `M ${points.map((p) => `${f2(p.x)} ${f2(p.y)}`).join(" L ")}`;
}

/** Smooth SVG path through points: quadratic curves via segment midpoints. */
export function smoothPath(points: ProjectedPoint[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${f2(points[0].x)} ${f2(points[0].y)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const mx = (points[i].x + points[i + 1].x) / 2;
    const my = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${f2(points[i].x)} ${f2(points[i].y)} ${f2(mx)} ${f2(my)}`;
  }
  const last = points[points.length - 1];
  d += ` L ${f2(last.x)} ${f2(last.y)}`;
  return d;
}

/** Offset a polyline sideways by `d` pt; positive is left of travel (y up). */
export function offsetPolyline(
  points: ProjectedPoint[],
  d: number,
): ProjectedPoint[] {
  if (Math.abs(d) < 0.01 || points.length < 2) return points;
  return points.map((p, i) => {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return {
      x: p.x - ((b.y - a.y) / len) * d,
      y: p.y + ((b.x - a.x) / len) * d,
    };
  });
}

/** Points and unit travel directions every `spacing` pt along a polyline. */
export function pointsAlong(
  pts: ProjectedPoint[],
  spacing: number,
  start = spacing / 2,
): { p: ProjectedPoint; dir: ProjectedPoint }[] {
  const out: { p: ProjectedPoint; dir: ProjectedPoint }[] = [];
  let next = start;
  let walked = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (seg === 0) continue;
    while (next <= walked + seg) {
      const t = (next - walked) / seg;
      out.push({
        p: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
        dir: { x: (b.x - a.x) / seg, y: (b.y - a.y) / seg },
      });
      next += spacing;
    }
    walked += seg;
  }
  return out;
}

/** Closest point on a polyline to `p`. */
function nearestOnPolyline(
  pts: ProjectedPoint[],
  p: ProjectedPoint,
): { q: ProjectedPoint; d: number } {
  let best = { q: pts[0] ?? p, d: Number.POSITIVE_INFINITY };
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy || 1;
    const t = Math.max(
      0,
      Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2),
    );
    const q = { x: a.x + dx * t, y: a.y + dy * t };
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d < best.d) best = { q, d };
  }
  return best;
}

/** Five-point star path (pointing up) as SVG, centered on (cx, cy). */
export function starPath(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.42;
    pts.push(`${f2(cx + rr * Math.cos(rad))} ${f2(cy + rr * Math.sin(rad))}`);
  }
  return `M ${pts.join(" L ")} Z`;
}

/** Round to a human scale bar length (m) that fits `maxMeters`. */
export function niceScaleBarMeters(maxMeters: number): number {
  const candidates = [50, 100, 200, 250, 500, 1000, 2000];
  let best = candidates[0];
  for (const c of candidates) if (c <= maxMeters) best = c;
  return best;
}

// ── Label placement ─────────────────────────────────────────────────────

export type Box = { x: number; y: number; w: number; h: number };

export type LabelRequest = {
  id: string;
  /** Anchor (the marker center) and the clearance around it. */
  ax: number;
  ay: number;
  gap: number;
  w: number;
  h: number;
  /** Higher places first and wins the space. */
  priority: number;
  /** Never dropped: walks outward (with a leader line) and, failing that, overlaps. */
  keep?: boolean;
  /** Only take spots clear of `lines` (the here and edge-exit labels). */
  clearOfLines?: boolean;
  /** Spots to try instead of the 8 around the anchor (edge-exit labels). */
  spots?: Box[];
};

export type PlacedLabel = Box & { leader: boolean };

const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** The 8 classic cartographic positions: right, left, above, below, then diagonals. */
export function labelCandidates(r: LabelRequest, gap = r.gap): Box[] {
  const { ax, ay, w, h } = r;
  const d = gap * 0.75;
  return [
    { x: ax + gap, y: ay - h / 2 },
    { x: ax - gap - w, y: ay - h / 2 },
    { x: ax - w / 2, y: ay + gap },
    { x: ax - w / 2, y: ay - gap - h },
    { x: ax + d, y: ay + d },
    { x: ax - d - w, y: ay + d },
    { x: ax + d, y: ay - d - h },
    { x: ax - d - w, y: ay - d - h },
  ].map((c) => ({ ...c, w, h }));
}

/**
 * Greedy collision pass: highest priority first, each label tries 8 positions
 * around its anchor and takes the first that is inside `bounds` and clear of
 * `obstacles` and earlier labels, preferring one that also misses `lines`
 * (route line samples). Labels that find no spot are dropped unless `keep`
 * is set. Returns placements by id; missing ids were dropped.
 */
export function placeLabels(
  requests: LabelRequest[],
  obstacles: Box[],
  bounds: Box,
  lines: Box[] = [],
): Map<string, PlacedLabel> {
  const placed = new Map<string, PlacedLabel>();
  const taken: Box[] = [...obstacles];
  const inside = (b: Box) =>
    b.x >= bounds.x &&
    b.y >= bounds.y &&
    b.x + b.w <= bounds.x + bounds.w &&
    b.y + b.h <= bounds.y + bounds.h;
  const free = (b: Box) => inside(b) && !taken.some((t) => overlaps(b, t));
  const clear = (b: Box) => free(b) && !lines.some((t) => overlaps(b, t));
  // A leader for a line-clear label must not cross lines or labels either.
  const leaderClear = (r: LabelRequest, b: Box) => {
    const cx = Math.min(Math.max(r.ax, b.x), b.x + b.w);
    const cy = Math.min(Math.max(r.ay, b.y), b.y + b.h);
    const len = Math.hypot(cx - r.ax, cy - r.ay);
    for (let t = r.gap; t < len; t += 2) {
      const dot = {
        x: r.ax + ((cx - r.ax) * t) / len,
        y: r.ay + ((cy - r.ay) * t) / len,
        w: 0,
        h: 0,
      };
      if (taken.some((o) => overlaps(dot, o))) return false;
      if (lines.some((o) => overlaps(dot, o))) return false;
    }
    return true;
  };
  // For line-clear labels, spots above or below the anchor also slide
  // sideways to fit between lines.
  const slid = (r: LabelRequest, boxes: Box[]) =>
    boxes.flatMap((b) =>
      b.y > r.ay || b.y + b.h < r.ay
        ? [0, -1, 1, -2, 2, -3, 3].map((k) => ({
            ...b,
            x: b.x + (k * b.w) / 6,
          }))
        : [b],
    );
  const sorted = [...requests].sort((a, b) => b.priority - a.priority);
  for (const r of sorted) {
    const pick = (boxes: Box[], ring = false) =>
      r.clearOfLines
        ? slid(r, boxes).find((b) => clear(b) && (!ring || leaderClear(r, b)))
        : (boxes.find(clear) ?? boxes.find(free));
    let spot: Box | undefined = pick(r.spots ?? labelCandidates(r));
    let leader = false;
    if (!spot && r.keep) {
      // Dense core: walk outward ring by ring and tie back with a leader.
      for (const ring of [2.2, 3.4, 4.6, 6, 7.5, 9]) {
        spot = pick(labelCandidates(r, r.gap * ring + 6), true);
        if (spot) {
          leader = true;
          break;
        }
      }
      spot ??= labelCandidates(r).find(inside) ?? labelCandidates(r)[0];
    }
    if (!spot) continue;
    placed.set(r.id, { ...spot, leader });
    taken.push(spot);
  }
  return placed;
}

function hexToRgb(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return rgb(0.2, 0.2, 0.2);
  const n = Number.parseInt(m[1], 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function darken(c: RGB, f: number): RGB {
  return rgb(c.red * f, c.green * f, c.blue * f);
}

const WINANSI_REPLACEMENTS: [RegExp, string][] = [
  [/\s*→\s*/g, " to "], // → rightwards arrow
  [/←/g, "<-"], // ← leftwards arrow
  [/↔/g, "<->"], // ↔ left-right arrow
  [/⇒/g, "=>"], // ⇒ double arrow
  [/≤/g, "<="],
  [/≥/g, ">="],
  [/•/g, "-"],
  [/\u00b7/g, ","], // interpunct
  [/\s*—\s*/g, ", "], // em dash reads as a comma on paper
  [/…/g, ""], // no ellipsis truncation in print
  [/ /g, " "],
];

/** Standard PDF fonts are WinAnsi; live data (route names like
 *  "Buendia → Los Baños") carries characters it cannot encode. Map the
 *  common typography and drop whatever is left rather than failing the print. */
export function toWinAnsi(text: string): string {
  let out = text;
  for (const [pattern, replacement] of WINANSI_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out.replace(
    /[^\t\n\r\x20-\x7E\u00A0-\u00FF\u2018\u2019\u201C\u201D\u2013]/g,
    "",
  );
}

/** Routes drawn on the diagram must live inside the campus area; intercity
 *  services (Manila, Calamba, Sta. Cruz) stay in the side list as text. */
const CAMPUS_AREA = {
  minLat: 14.1,
  maxLat: 14.2,
  minLon: 121.2,
  maxLon: 121.28,
};

export function isCampusScopeRoute(route: TransitMapRoute): boolean {
  return (
    route.stops.length >= 2 &&
    route.stops.every(
      (s) =>
        s.lat >= CAMPUS_AREA.minLat &&
        s.lat <= CAMPUS_AREA.maxLat &&
        s.lon >= CAMPUS_AREA.minLon &&
        s.lon <= CAMPUS_AREA.maxLon,
    )
  );
}

/** A loop starts and ends at the same stop and runs both ways (Kaliwa / Kanan). */
/**
 * A loop run in both directions (Kaliwa / Kanan): the printed map draws both
 * travel directions and the legend splits the "A / B" name. A one-way loop
 * such as the SNODLOB e-jeep is drawn like any other single line.
 */
export function isLoopRoute(route: TransitMapRoute): boolean {
  const first = route.stops[0];
  const last = route.stops[route.stops.length - 1];
  return (
    /\s\/\s/.test(route.name) &&
    route.stops.length >= 3 &&
    !!first &&
    !!last &&
    first.name === last.name &&
    haversineMeters(first, last) < 60
  );
}

/** Dash patterns for non-loop routes, so lines differ beyond color. */
const ROUTE_DASHES: number[][] = [
  [7, 2.5, 1.5, 2.5],
  [1.6, 2.4],
  [10, 3.5],
];
/** The reverse direction of a loop is dashed and hollow; the forward one is solid. */
export const LOOP_REVERSE_DASH = [6, 3];

/** Line style per drawn route: each pattern unique so grayscale still reads. */
export function routeLineStyles(
  routes: TransitMapRoute[],
): Map<string, { dash: number[] | null; reverseDash: number[] | null }> {
  const styles = new Map<
    string,
    { dash: number[] | null; reverseDash: number[] | null }
  >();
  let i = 0;
  for (const route of routes) {
    if (isLoopRoute(route)) {
      styles.set(route.id, { dash: null, reverseDash: LOOP_REVERSE_DASH });
    } else {
      styles.set(route.id, {
        dash: ROUTE_DASHES[i % ROUTE_DASHES.length],
        reverseDash: null,
      });
      i++;
    }
  }
  return styles;
}

/**
 * SVG path (y-down, anchored at the page top) for a rounded rectangle given
 * in PDF space: (x, y) is the bottom-left corner.
 */
function roundRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  pageH: number,
): string {
  const top = pageH - (y + h);
  const rr = Math.min(r, w / 2, h / 2);
  return [
    `M ${x + rr} ${top}`,
    `L ${x + w - rr} ${top} Q ${x + w} ${top} ${x + w} ${top + rr}`,
    `L ${x + w} ${top + h - rr} Q ${x + w} ${top + h} ${x + w - rr} ${top + h}`,
    `L ${x + rr} ${top + h} Q ${x} ${top + h} ${x} ${top + h - rr}`,
    `L ${x} ${top + rr} Q ${x} ${top} ${x + rr} ${top} Z`,
  ].join(" ");
}

/**
 * A little side-on jeepney, about 40 x 22 pt at scale 1, with its
 * bottom-left at (x, y): body, roof rack, windows, wheels.
 */
function drawJeep(
  page: PDFPage,
  pageH: number,
  x: number,
  y: number,
  scale: number,
  body: RGB,
) {
  const s = scale;
  const anchor = { x: 0, y: pageH };
  page.drawSvgPath(roundRectPath(x, y + 4 * s, 40 * s, 14 * s, 4 * s, pageH), {
    ...anchor,
    color: body,
    borderColor: INK,
    borderWidth: 1.2 * s,
  });
  page.drawSvgPath(
    roundRectPath(x + 4 * s, y + 18 * s, 30 * s, 3 * s, 1.5 * s, pageH),
    {
      ...anchor,
      color: INK,
    },
  );
  for (let i = 0; i < 4; i++) {
    page.drawSvgPath(
      roundRectPath(
        x + (5 + i * 8) * s,
        y + 11 * s,
        6 * s,
        5 * s,
        1.2 * s,
        pageH,
      ),
      { ...anchor, color: WHITE, borderColor: INK, borderWidth: 0.8 * s },
    );
  }
  for (const wx of [10, 31]) {
    page.drawCircle({
      x: x + wx * s,
      y: y + 4 * s,
      size: 4 * s,
      color: INK,
      borderColor: WHITE,
      borderWidth: 1 * s,
    });
  }
}

/**
 * A little side-on bus, about 40 x 20 pt at scale 1, with its bottom-left
 * at (x, y): long body, a band of windows, door, wheels.
 */
function drawBus(
  page: PDFPage,
  pageH: number,
  x: number,
  y: number,
  scale: number,
  body: RGB,
) {
  const s = scale;
  const anchor = { x: 0, y: pageH };
  page.drawSvgPath(roundRectPath(x, y + 4 * s, 40 * s, 16 * s, 3 * s, pageH), {
    ...anchor,
    color: body,
    borderColor: INK,
    borderWidth: 1.2 * s,
  });
  page.drawSvgPath(
    roundRectPath(x + 3 * s, y + 12 * s, 28 * s, 5.5 * s, 1.2 * s, pageH),
    { ...anchor, color: WHITE, borderColor: INK, borderWidth: 0.8 * s },
  );
  page.drawSvgPath(
    roundRectPath(x + 33 * s, y + 6 * s, 4.5 * s, 11.5 * s, 1 * s, pageH),
    { ...anchor, color: WHITE, borderColor: INK, borderWidth: 0.8 * s },
  );
  for (const wx of [9, 29]) {
    page.drawCircle({
      x: x + wx * s,
      y: y + 4 * s,
      size: 4 * s,
      color: INK,
      borderColor: WHITE,
      borderWidth: 1 * s,
    });
  }
}

/**
 * Draw mixed regular/bold text, wrapping on spaces across runs. Lines past
 * `maxLines` are dropped.
 */
function drawRuns(
  page: PDFPage,
  runs: { text: string; bold?: boolean }[],
  x: number,
  y: number,
  maxW: number,
  size: number,
  leading: number,
  maxLines: number,
  fonts: { regular: PDFFont; bold: PDFFont; color: RGB; boldColor?: RGB },
) {
  const words = runs.flatMap((run) =>
    run.text
      .split(/(\s+)/)
      .filter((w) => w.length > 0)
      .map((w) => ({
        text: w,
        font: run.bold ? fonts.bold : fonts.regular,
        color: run.bold ? (fonts.boldColor ?? fonts.color) : fonts.color,
      })),
  );
  const lines: (typeof words)[] = [[]];
  let lineW = 0;
  for (const word of words) {
    const w = word.font.widthOfTextAtSize(word.text, size);
    const space = /^\s+$/.test(word.text);
    if (!space && lineW + w > maxW && lines[lines.length - 1]!.length > 0) {
      lines.push([]);
      lineW = 0;
    }
    if (space && lineW === 0) continue;
    lines[lines.length - 1]!.push(word);
    lineW += w;
  }
  lines.slice(0, maxLines).forEach((line, i) => {
    let cx = x;
    for (const word of line) {
      page.drawText(word.text, {
        x: cx,
        y: y - i * leading,
        size,
        font: word.font,
        color: word.color,
      });
      cx += word.font.widthOfTextAtSize(word.text, size);
    }
  });
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxW: number,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxW && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const MAX_LABEL_CHARS = 30;

/**
 * A stop name short enough for a map label: merged names ("CEAT Lecture
 * Hall / CEAT-DCE / ...") keep their first part, a short parenthetical
 * alias ("... (New FOREHA)") stands in for the long form, and anything still
 * too long is cut at a word.
 */
export function shortStopLabel(name: string, parts = 1): string {
  let text = name.split(" / ").slice(0, parts).join(" / ").trim();
  const alias = /\(([^()]{2,14})\)\s*$/.exec(text)?.[1];
  if (alias && /[A-Z]{3}/.test(alias)) text = alias;
  else text = text.replace(/\s*\([^()]*\)\s*$/, "") || text;
  if (text.length <= MAX_LABEL_CHARS) return text;
  const cut = text.slice(0, MAX_LABEL_CHARS - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > 10 ? cut.slice(0, space) : cut).replace(/[\s,/-]+$/, "")}...`;
}

/** White "halo" under dark text keeps labels readable over line work. */
function haloText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  size: number,
  font: PDFFont,
  color = INK,
) {
  for (const [dx, dy] of [
    [0.6, 0],
    [-0.6, 0],
    [0, 0.6],
    [0, -0.6],
    [0.45, 0.45],
    [-0.45, -0.45],
    [0.45, -0.45],
    [-0.45, 0.45],
  ]) {
    page.drawText(text, { x: x + dx, y: y + dy, size, font, color: WHITE });
  }
  page.drawText(text, { x, y, size, font, color });
}

/** Ordinal list "A", "A and B", "A, B and C". */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

type MapStop = {
  key: string;
  name: string;
  lat: number;
  lon: number;
  routeIds: string[];
  terminal: boolean;
  /** Sort key for the numbered index: route order, then stop order. */
  order: number;
};

/** Merge stops of different routes that sit within 30 m of each other. */
function mergeStops(routes: TransitMapRoute[]): MapStop[] {
  const out: MapStop[] = [];
  routes.forEach((route, ri) => {
    const loop = isLoopRoute(route);
    route.stops.forEach((stop, si) => {
      // Named terminals count too: Forestry's downhill trips start mid-list.
      const terminal =
        si === 0 ||
        (!loop && si === route.stops.length - 1) ||
        /\bterminal\b/i.test(stop.name);
      const hit = out.find((m) => haversineMeters(m, stop) < 30);
      if (hit) {
        if (!hit.routeIds.includes(route.id)) hit.routeIds.push(route.id);
        hit.terminal ||= terminal;
        const a = hit.name.toLowerCase();
        const b = stop.name.toLowerCase();
        if (b.includes(a)) hit.name = stop.name;
        else if (!a.includes(b)) hit.name = `${hit.name} / ${stop.name}`;
        return;
      }
      out.push({
        key: `s${out.length}`,
        name: stop.name,
        lat: stop.lat,
        lon: stop.lon,
        routeIds: [route.id],
        terminal,
        order: ri * 1000 + si,
      });
    });
  });
  return out;
}

export async function renderTransitMapPdf(input: {
  routes: TransitMapRoute[];
  here?: TransitMapHere | null;
  basemap?: TransitBasemap | null;
  format?: TransitMapFormat;
  generatedAt?: Date;
  palette?: TransitMapPalette;
}): Promise<Uint8Array> {
  const format = input.format ?? "a4";
  const { w: pageW, h: pageH } = PAGE_SIZES[format];
  const generatedAt = input.generatedAt ?? new Date();
  const palette = TRANSIT_MAP_PALETTES[input.palette ?? "high-contrast"];

  const pdf = await PDFDocument.create();
  pdf.setTitle("UPLB Jeepney Routes");
  pdf.setAuthor("Room TBA");
  pdf.setSubject("Printable map of UPLB jeepney routes and stops");
  pdf.setCreator("Room TBA (room-tba.uplb.tools)");
  pdf.setLanguage("en-PH");
  pdf.setCreationDate(generatedAt);

  const page = pdf.addPage([pageW, pageH]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const routes = input.routes.map((route) => ({
    ...route,
    color: palette.routes[route.id] ?? route.color,
    reverseColor: palette.loopReverse[route.id] ?? null,
    name: toWinAnsi(route.name),
    directionNote: route.directionNote ? toWinAnsi(route.directionNote) : null,
    boardingNote: route.boardingNote ? toWinAnsi(route.boardingNote) : null,
    stops: route.stops.map((stop) => ({ ...stop, name: toWinAnsi(stop.name) })),
  }));
  const drawnRoutes = routes.filter(isCampusScopeRoute);
  const reverseColorOf = (r: (typeof routes)[number]) =>
    r.reverseColor ? hexToRgb(r.reverseColor) : darken(hexToRgb(r.color), 0.62);
  const styles = routeLineStyles(drawnRoutes);
  const stops = mergeStops(drawnRoutes);

  // Campus center: the median stop, robust to the far-off mall terminals.
  const median = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)] ?? 0;
  };
  const center = {
    lat: median(stops.map((s) => s.lat)),
    lon: median(stops.map((s) => s.lon)),
  };
  const coreStops = stops.filter(
    (s) => haversineMeters(s, center) <= CORE_RADIUS_M,
  );

  const here = input.here
    ? {
        ...input.here,
        // A name of only unprintable characters sanitizes to "".
        name: (input.here.name && toWinAnsi(input.here.name).trim()) || null,
      }
    : null;
  const hereOnMap =
    here !== null &&
    stops.length > 0 &&
    haversineMeters(here, center) <= HERE_MAX_M;
  const nearest = here && hereOnMap ? findNearestStop(here, stops) : null;

  // ── Header ────────────────────────────────────────────────────────────
  // Headings are Raleway outlines baked by scripts/generate-print-brand.py,
  // since pdf-lib can only set text in the standard fonts.
  const raleway = (
    text: keyof typeof RALEWAY_BOLD_HEADINGS,
    x: number,
    y: number,
    size: number,
    color: RGB,
  ) =>
    page.drawSvgPath(RALEWAY_BOLD_HEADINGS[text].d, {
      x,
      y,
      scale: size / 1000,
      color,
    });
  // A maroon band with a wavy hem: the sheet is taped up around campus, so
  // the top should read as a poster, not a printout.
  const bandBottom = pageH - HEADER_H + 10;
  let wave = `M 0 0 L ${pageW} 0 L ${pageW} ${pageH - bandBottom}`;
  const waveStep = 18;
  for (let x = pageW; x > 0; x -= waveStep) {
    const nx = Math.max(0, x - waveStep);
    wave += ` Q ${(x + nx) / 2} ${pageH - bandBottom + 7} ${nx} ${pageH - bandBottom}`;
  }
  page.drawSvgPath(`${wave} Z`, { x: 0, y: pageH, color: BRAND });

  raleway("UPLB Jeepney Routes", MARGIN, pageH - 36, 23, WHITE);
  const titleW =
    (RALEWAY_BOLD_HEADINGS["UPLB Jeepney Routes"].width * 23) / 1000;
  drawJeep(page, pageH, MARGIN + titleW + 14, pageH - 38, 0.62, SUNNY);

  // Brand block, top right. The QR is a white tag hanging past the hem,
  // about 3 cm wide so it scans from a step back on a wall; it leads back
  // to the app, and the ref param lets prints be counted.
  const qrSize = 88;
  const qrX = pageW - MARGIN - 6 - qrSize;
  const qrTop = pageH - 8;
  const tagBottom = qrTop - qrSize - 18;
  page.drawSvgPath(
    roundRectPath(
      qrX - 6,
      tagBottom,
      qrSize + 12,
      pageH - 2 - tagBottom,
      8,
      pageH,
    ),
    {
      x: 0,
      y: pageH,
      color: WHITE,
      borderColor: INK,
      borderWidth: 1.2,
    },
  );
  const cta = "SCAN ME";
  page.drawText(cta, {
    x: qrX + (qrSize - bold.widthOfTextAtSize(cta, 10)) / 2,
    y: tagBottom + 5,
    size: 10,
    font: bold,
    color: BRAND,
  });
  const cell = qrSize / PRINT_MAP_QR.length;
  PRINT_MAP_QR.forEach((row, r) => {
    for (const run of row.matchAll(/1+/g)) {
      page.drawRectangle({
        x: qrX + (run.index ?? 0) * cell,
        y: qrTop - (r + 1) * cell,
        width: run[0].length * cell,
        height: cell,
        color: INK,
      });
    }
  });
  const brandRight = qrX - 18;
  const logo = await pdf.embedPng(LOGO_PNG_BASE64);
  const wordSize = 15;
  const wordW = (RALEWAY_BOLD_HEADINGS["Room TBA"].width * wordSize) / 1000;
  raleway("Room TBA", brandRight - wordW, pageH - 27, wordSize, WHITE);
  page.drawSvgPath(
    roundRectPath(brandRight - wordW - 28, pageH - 32, 24, 24, 6, pageH),
    {
      x: 0,
      y: pageH,
      color: WHITE,
    },
  );
  page.drawImage(logo, {
    x: brandRight - wordW - 27,
    y: pageH - 31,
    width: 22,
    height: 22,
  });
  const brandLines: [string, PDFFont, number, RGB][] = [
    ["by UPLB Tools", bold, 9, WHITE],
    ["Find any room or jeep route.", font, 9, SOFT_ON_BRAND],
    ["room-tba.uplb.tools", bold, 9, SUNNY],
  ];
  brandLines.forEach(([text, fnt, size, color], i) => {
    page.drawText(text, {
      x: brandRight - fnt.widthOfTextAtSize(text, size),
      y: pageH - 43 - i * 11.5,
      size,
      font: fnt,
      color,
    });
  });
  const brandW = Math.max(
    wordW + 25,
    ...brandLines.map(([text, fnt, size]) => fnt.widthOfTextAtSize(text, size)),
  );
  const introW = brandRight - brandW - 16 - MARGIN;

  // Vercel runs in UTC; without the zone, sheets printed before 8 AM in
  // Los Baños carry yesterday's date.
  const dateLabel = generatedAt.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Manila",
  });
  // The intro is the part that changes per sheet, so its variable words are
  // bold: someone reading a taped-up copy finds "where am I" at a glance.
  type Run = { text: string; bold?: boolean };
  let intro: Run[];
  if (here && nearest) {
    const servedBy = joinNames(
      drawnRoutes
        .filter((r) => nearest.stop.routeIds.includes(r.id))
        .map((r) => r.name),
    );
    intro = [
      { text: "You are at " },
      { text: here.name ?? "the star on this map", bold: true },
      { text: ". The nearest jeepney stop is " },
      { text: nearest.stop.name, bold: true },
      { text: `, about ${formatDistance(nearest.walkM)} on foot. ` },
      { text: servedBy, bold: true },
      {
        text: ` ${nearest.stop.routeIds.length > 1 ? "stop" : "stops"} there.`,
      },
    ];
  } else if (here) {
    intro = [
      { text: here.name ?? "This spot", bold: true },
      {
        text: ` is about ${formatDistance(haversineMeters(here, center))} from campus, outside this map. The routes below still show how to reach UPLB.`,
      },
    ];
  } else {
    intro = [{ text: "Campus jeepney routes and their stops." }];
  }
  const INTRO_SIZE = 11;
  drawRuns(page, intro, MARGIN, pageH - 56, introW, INTRO_SIZE, 14, 2, {
    regular: font,
    bold,
    color: WHITE,
    boldColor: SUNNY,
  });

  // ── Map frame ─────────────────────────────────────────────────────────
  const frame: Box = {
    x: MARGIN,
    y: FOOTER_H + 8,
    w: pageW - MARGIN * 2 - PANEL_W - PANEL_GAP,
    h: pageH - HEADER_H - 10 - FOOTER_H - 8,
  };
  page.drawRectangle({
    x: frame.x + 4,
    y: frame.y - 4,
    width: frame.w,
    height: frame.h,
    color: BRAND,
  });
  page.drawRectangle({
    x: frame.x,
    y: frame.y,
    width: frame.w,
    height: frame.h,
    color: WHITE,
  });

  const fitPoints: LatLon[] = [...coreStops];
  if (here && hereOnMap) fitPoints.push(here);
  const projector = makeProjector(fitPoints, {
    x: frame.x + 10,
    y: frame.y + 10,
    w: frame.w - 20,
    h: frame.h - 20,
  });

  // pdf-lib's drawSvgPath follows SVG's y-down convention from its anchor;
  // anchoring at the page top and flipping every point keeps the projector
  // in ordinary PDF space (y-up) while line work lands where intended.
  const toSvg = (p: ProjectedPoint): ProjectedPoint => ({
    x: p.x,
    y: pageH - p.y,
  });
  const pathOf = (pts: ProjectedPoint[]) => polylinePath(pts.map(toSvg));
  const svgAnchor = { x: 0, y: pageH };
  const inFrame = (p: ProjectedPoint, pad = 0) =>
    p.x >= frame.x + pad &&
    p.x <= frame.x + frame.w - pad &&
    p.y >= frame.y + pad &&
    p.y <= frame.y + frame.h - pad;

  if (projector && stops.length > 0) {
    const { project, ptPerMeter } = projector;
    const proj = (p: LatLon) => project(p.lat, p.lon);

    page.pushOperators(
      pushGraphicsState(),
      rectangle(frame.x, frame.y, frame.w, frame.h),
      clip(),
      endPath(),
    );

    // Basemap: one compound path per layer keeps the PDF small and fast.
    const layerPath = (ways: [number, number][][], closed: boolean) => {
      let d = "";
      for (const way of ways) {
        const pts = way.map(([lon, lat]) => project(lat, lon));
        if (!pts.some((p) => inFrame(p, -20))) continue;
        d += `${pathOf(pts)}${closed ? " Z" : ""} `;
      }
      return d;
    };
    const gateMarks: { name: string; p: ProjectedPoint }[] = [];
    if (input.basemap) {
      const b = input.basemap;
      const buildings = layerPath(b.buildings, true);
      if (buildings)
        page.drawSvgPath(buildings, { ...svgAnchor, color: palette.building });
      const water = layerPath(b.water, false);
      if (water)
        page.drawSvgPath(water, {
          ...svgAnchor,
          borderColor: palette.water,
          borderWidth: 1.4,
        });
      const minor = layerPath(b.roadsMinor, false);
      if (minor)
        page.drawSvgPath(minor, {
          ...svgAnchor,
          borderColor: palette.roadMinor,
          borderWidth: 1.1,
          borderLineCap: 1,
        });
      const major = layerPath(b.roadsMajor, false);
      if (major)
        page.drawSvgPath(major, {
          ...svgAnchor,
          borderColor: palette.roadMajor,
          borderWidth: 2.9,
          borderLineCap: 1,
        });
      for (const gate of b.gates) {
        const p = proj(gate);
        const name = toWinAnsi(gate.name);
        // A stop already named after the gate labels it; skip the duplicate.
        const named = stops.some((st) =>
          st.name.toLowerCase().includes(name.toLowerCase()),
        );
        if (inFrame(p, 6)) gateMarks.push({ name: named ? "" : name, p });
      }
    }

    // Routes: a white casing, then the line itself. Loops draw both travel
    // directions side by side (right-hand traffic: each on its own right).
    const routeLines = new Map<string, ProjectedPoint[]>();
    const arrows: { pts: ProjectedPoint[]; color: RGB; hollow: boolean }[] = [];
    for (const route of drawnRoutes) {
      const source =
        route.line && route.line.length >= 2 ? route.line : route.stops;
      const pts = source.map(proj);
      routeLines.set(route.id, pts);
      const color = hexToRgb(route.color);
      const style = styles.get(route.id);
      const loop = isLoopRoute(route);
      page.drawSvgPath(pathOf(pts), {
        ...svgAnchor,
        borderColor: WHITE,
        borderWidth: loop ? 12 : 7.5,
        borderLineCap: 1,
      });
      if (loop) {
        // Kaliwa solid with filled arrows; Kanan its own hue, dashed and
        // hollow with hollow arrows, so the two part even in grayscale.
        const revColor = reverseColorOf(route);
        const revDash = style?.reverseDash ?? LOOP_REVERSE_DASH;
        const fwd = offsetPolyline(pts, -2.8);
        const rev = offsetPolyline([...pts].reverse(), -2.8);
        page.drawSvgPath(pathOf(fwd), {
          ...svgAnchor,
          borderColor: color,
          borderWidth: 2.8,
          borderLineCap: 1,
        });
        page.drawSvgPath(pathOf(rev), {
          ...svgAnchor,
          borderColor: revColor,
          borderWidth: 3.8,
          borderDashArray: revDash,
        });
        page.drawSvgPath(pathOf(rev), {
          ...svgAnchor,
          borderColor: WHITE,
          borderWidth: 1.3,
          borderDashArray: revDash,
        });
        arrows.push(
          { pts: fwd, color, hollow: false },
          { pts: rev, color: revColor, hollow: true },
        );
      } else {
        page.drawSvgPath(pathOf(pts), {
          ...svgAnchor,
          borderColor: color,
          borderWidth: 4,
          borderDashArray: style?.dash ?? undefined,
        });
      }
    }
    // Direction chevrons in travel order, offset so the two directions do
    // not stack their arrows at the same spot.
    arrows.forEach(({ pts, color, hollow }, i) => {
      for (const { p, dir } of pointsAlong(pts, 60, 20 + i * 30)) {
        if (!inFrame(p, 4)) continue;
        const s = 4.4;
        const nx = -dir.y;
        const ny = dir.x;
        const tip = { x: p.x + dir.x * s, y: p.y + dir.y * s };
        const l = { x: p.x - dir.x * s + nx * s, y: p.y - dir.y * s + ny * s };
        const r = { x: p.x - dir.x * s - nx * s, y: p.y - dir.y * s - ny * s };
        page.drawSvgPath(`${pathOf([l, tip, r])} Z`, {
          ...svgAnchor,
          color: hollow ? WHITE : color,
          borderColor: hollow ? color : WHITE,
          borderWidth: hollow ? 1.3 : 0.8,
        });
      }
    });

    // Stop positions: snapped onto their route line when it passes close,
    // so a road-routed line and its stops never visibly disagree.
    const stopPos = new Map<string, ProjectedPoint>();
    for (const stop of stops) {
      const raw = proj(stop);
      const line = routeLines.get(stop.routeIds[0]);
      const near = line ? nearestOnPolyline(line, raw) : null;
      stopPos.set(stop.key, near && near.d < 14 ? near.q : raw);
    }
    // A stop hugging the edge joins the edge arrow instead of a cramped label.
    const onMap = stops.filter((s) => inFrame(stopPos.get(s.key)!, 12));
    const offMap = stops.filter((s) => !inFrame(stopPos.get(s.key)!, 12));

    // Walk from here to the nearest stop.
    const hereP = here && hereOnMap ? proj(here) : null;
    const nearestP = nearest ? stopPos.get(nearest.stop.key) : undefined;
    if (hereP && nearestP) {
      page.drawLine({
        start: hereP,
        end: nearestP,
        thickness: 1.6,
        color: BRAND,
        dashArray: [2.5, 2.5],
        lineCap: 1,
      });
    }

    // Line samples: the here and edge-exit labels stay off route lines and
    // the walk, and stop labels avoid them where they can.
    const lineBoxes: Box[] = [];
    const sampleLine = (pts: ProjectedPoint[], r: number) => {
      for (const { p } of pointsAlong(pts, 3, 0))
        if (inFrame(p))
          lineBoxes.push({ x: p.x - r, y: p.y - r, w: r * 2, h: r * 2 });
    };
    for (const route of drawnRoutes)
      sampleLine(routeLines.get(route.id) ?? [], isLoopRoute(route) ? 6 : 3.5);
    if (hereP && nearestP) sampleLine([hereP, nearestP], 2);

    const obstacles: Box[] = [];
    const markerR = (s: MapStop) => (s.terminal ? 4.6 : 3.4);
    for (const stop of onMap) {
      const p = stopPos.get(stop.key)!;
      const shared = stop.routeIds.length > 1;
      const route = drawnRoutes.find((r) => r.id === stop.routeIds[0]);
      const r = markerR(stop);
      page.drawCircle({
        x: p.x,
        y: p.y,
        size: r,
        color: WHITE,
        borderColor: shared ? INK : hexToRgb(route?.color ?? "#333333"),
        borderWidth: stop.terminal || shared ? 1.9 : 1.4,
      });
      obstacles.push({ x: p.x - r, y: p.y - r, w: r * 2, h: r * 2 });
    }
    for (const g of gateMarks) {
      page.drawRectangle({
        x: g.p.x - 2.2,
        y: g.p.y - 2.2,
        width: 4.4,
        height: 4.4,
        color: MUTED,
        borderColor: WHITE,
        borderWidth: 0.6,
      });
    }
    if (nearestP) {
      page.drawCircle({
        x: nearestP.x,
        y: nearestP.y,
        size: 7.5,
        borderColor: BRAND,
        borderWidth: 1.6,
      });
      obstacles.push({ x: nearestP.x - 8, y: nearestP.y - 8, w: 16, h: 16 });
    }
    if (hereP) {
      page.drawSvgPath(starPath(hereP.x, pageH - hereP.y, 9), {
        ...svgAnchor,
        color: BRAND,
        borderColor: WHITE,
        borderWidth: 1.2,
      });
      obstacles.push({ x: hereP.x - 10, y: hereP.y - 10, w: 20, h: 20 });
    }

    page.pushOperators(popGraphicsState());

    // Off-frame stops: an arrow where the route leaves the frame, labelled
    // in one line with where it goes and how far, instead of shrinking the
    // campus to fit them.
    const from = here && hereOnMap ? here : center;
    const exits: {
      p: ProjectedPoint;
      side: "n" | "s" | "e" | "w";
      stops: MapStop[];
    }[] = [];
    const inset = 7;
    const edgeHit = (a: ProjectedPoint, b: ProjectedPoint) => {
      // Binary search the crossing between an inside and an outside point.
      let lo = a;
      let hi = b;
      for (let k = 0; k < 24; k++) {
        const mid = { x: (lo.x + hi.x) / 2, y: (lo.y + hi.y) / 2 };
        if (inFrame(mid, inset)) lo = mid;
        else hi = mid;
      }
      return lo;
    };
    for (const stop of offMap) {
      const target = stopPos.get(stop.key)!;
      const line = routeLines.get(stop.routeIds[0]) ?? [];
      let best: ProjectedPoint | null = null;
      for (let i = 1; i < line.length; i++) {
        const aIn = inFrame(line[i - 1], inset);
        const bIn = inFrame(line[i], inset);
        if (aIn === bIn) continue;
        const hit = aIn
          ? edgeHit(line[i - 1], line[i])
          : edgeHit(line[i], line[i - 1]);
        if (
          !best ||
          Math.hypot(hit.x - target.x, hit.y - target.y) <
            Math.hypot(best.x - target.x, best.y - target.y)
        )
          best = hit;
      }
      if (!best) {
        const c = { x: frame.x + frame.w / 2, y: frame.y + frame.h / 2 };
        best = edgeHit(c, {
          x: c.x + (target.x - c.x) * 50,
          y: c.y + (target.y - c.y) * 50,
        });
      }
      const dists = {
        n: frame.y + frame.h - best.y,
        s: best.y - frame.y,
        e: frame.x + frame.w - best.x,
        w: best.x - frame.x,
      };
      const side = Object.entries(dists).sort((a, b) => a[1] - b[1])[0][0] as
        | "n"
        | "s"
        | "e"
        | "w";
      const near = exits.find(
        (e) =>
          e.side === side && Math.hypot(e.p.x - best!.x, e.p.y - best!.y) < 60,
      );
      if (near) near.stops.push(stop);
      else exits.push({ p: best, side, stops: [stop] });
    }
    for (const exit of exits) {
      const { p, side } = exit;
      const dir = { n: [0, 1], s: [0, -1], e: [1, 0], w: [-1, 0] }[side];
      const s = 6;
      const tip = { x: p.x + dir[0] * s, y: p.y + dir[1] * s };
      const nx = -dir[1];
      const ny = dir[0];
      const base = { x: p.x - dir[0] * s, y: p.y - dir[1] * s };
      page.drawSvgPath(
        `${pathOf([
          { x: base.x + nx * s, y: base.y + ny * s },
          tip,
          { x: base.x - nx * s, y: base.y - ny * s },
        ])} Z`,
        { ...svgAnchor, color: INK, borderColor: WHITE, borderWidth: 1 },
      );
      obstacles.push({
        x: p.x - s - 2,
        y: p.y - s - 2,
        w: s * 2 + 4,
        h: s * 2 + 4,
      });
    }

    // Scale bar and north arrow (bottom-right) reserve space before labels
    // are placed. The bar takes whichever free corner no route line crosses,
    // so it never sits on a route (Forestry runs into the bottom-left).
    const barMaxPt = 90;
    const meters = niceScaleBarMeters(barMaxPt / ptPerMeter);
    const barPt = meters * ptPerMeter;
    const barBoxW = barPt + 40;
    const linePts = [...routeLines.values()].flat();
    const corners = [
      { x: frame.x + 12, y: frame.y + 12 },
      { x: frame.x + frame.w - barBoxW - 30, y: frame.y + 12 },
      { x: frame.x + 12, y: frame.y + frame.h - 14 },
    ];
    const crossings = (c: ProjectedPoint) =>
      linePts.filter(
        (p) =>
          p.x >= c.x - 14 &&
          p.x <= c.x + barBoxW + 10 &&
          p.y >= c.y - 16 &&
          p.y <= c.y + 18,
      ).length;
    const { x: barX, y: barY } = corners.reduce((best, c) =>
      crossings(c) < crossings(best) ? c : best,
    );
    page.drawRectangle({
      x: barX - 4,
      y: barY - 6,
      width: barBoxW,
      height: 14,
      color: WHITE,
      opacity: 0.85,
    });
    page.drawLine({
      start: { x: barX, y: barY },
      end: { x: barX + barPt, y: barY },
      thickness: 1.5,
      color: INK,
    });
    for (const dx of [0, barPt / 2, barPt]) {
      page.drawLine({
        start: { x: barX + dx, y: barY - 2.5 },
        end: { x: barX + dx, y: barY + 2.5 },
        thickness: 1.5,
        color: INK,
      });
    }
    page.drawText(meters >= 1000 ? `${meters / 1000} km` : `${meters} m`, {
      x: barX + barPt + 5,
      y: barY - 3,
      size: 8.5,
      font,
      color: INK,
    });
    obstacles.push({ x: barX - 4, y: barY - 6, w: barBoxW, h: 14 });
    // Bottom-right: the top edge is where the mall terminals' arrows land.
    const nx = frame.x + frame.w - 18;
    const ny = frame.y + 14;
    page.drawSvgPath(
      `M ${nx} ${pageH - (ny + 10)} L ${nx - 4.5} ${pageH - (ny - 6)} L ${nx} ${pageH - (ny - 2)} L ${nx + 4.5} ${pageH - (ny - 6)} Z`,
      { ...svgAnchor, color: INK },
    );
    page.drawText("N", {
      x: nx - 2.5,
      y: ny + 12,
      size: 8,
      font: bold,
      color: INK,
    });
    obstacles.push({ x: nx - 8, y: ny - 8, w: 16, h: 30 });

    // ── Labels ──────────────────────────────────────────────────────────
    type Spec = LabelRequest & {
      text: string;
      size: number;
      font: PDFFont;
      color: RGB;
    };
    const specs: Spec[] = [];
    const add = (
      id: string,
      text: string,
      p: ProjectedPoint,
      gap: number,
      size: number,
      fnt: PDFFont,
      color: RGB,
      priority: number,
      keep = false,
      clearOfLines = false,
    ) => {
      const spec: Spec = {
        id,
        text,
        ax: p.x,
        ay: p.y,
        gap,
        w: Math.max(
          ...text.split("\n").map((l) => fnt.widthOfTextAtSize(l, size)),
        ),
        h: size + (text.split("\n").length - 1) * size * 1.15,
        size,
        font: fnt,
        color,
        priority,
        keep,
        clearOfLines,
      };
      specs.push(spec);
      return spec;
    };
    if (hereP && here)
      add(
        "here",
        here.name ? `You are here\n${here.name}` : "You are here",
        hereP,
        12,
        11,
        bold,
        BRAND,
        100,
        true,
        true,
      );
    // One line per edge exit: terminals first, then the nearest stops, as
    // many as fit, with the distance range of those named.
    const distTo = (st: MapStop) => haversineMeters(from, st);
    exits.forEach((exit, i) => {
      const byDist = [...exit.stops].sort((a, b) => distTo(a) - distTo(b));
      const picked = [
        ...byDist.filter((st) => st.terminal),
        ...byDist.filter((st) => !st.terminal),
      ].slice(0, 3);
      const textOf = (list: MapStop[]) => {
        const shown = byDist.filter((st) => list.includes(st));
        const ds = shown.map(distTo);
        const lo = formatDistance(Math.min(...ds));
        const hi = formatDistance(Math.max(...ds));
        const range =
          lo === hi
            ? lo
            : `${lo.endsWith(" km") && hi.endsWith(" km") ? lo.slice(0, -3) : lo}-${hi}`;
        return `To ${shown.map((st) => shortStopLabel(st.name)).join(", ")} (${range})`;
      };
      while (
        picked.length > 1 &&
        bold.widthOfTextAtSize(textOf(picked), 9) > 250
      )
        picked.pop();
      const spec = add(
        `exit${i}`,
        textOf(picked),
        exit.p,
        10,
        9,
        bold,
        INK,
        95,
        true,
        true,
      );
      // Beside the arrow along its edge, sliding away until clear of lines.
      const { x, y } = exit.p;
      const { w, h } = spec;
      const vertical = exit.side === "n" || exit.side === "s";
      const spots: Box[] = [];
      for (let k = 0; k <= 6; k++) {
        const off = 10 + k * 12;
        const pairs: [number, number][] = vertical
          ? [y - h / 2, exit.side === "n" ? y - 12 - h : y + 12].flatMap(
              (by): [number, number][] => [
                [x + off, by],
                [x - off - w, by],
              ],
            )
          : [y + off, y - off - h].map((by): [number, number] => [
              exit.side === "e" ? x - 12 - w : x + 12,
              by,
            ]);
        for (const [bx, by] of pairs) spots.push({ x: bx, y: by, w, h });
      }
      spec.spots = spots;
    });
    const fromP = hereP ?? project(center.lat, center.lon);
    const byDistance = [...onMap].sort((a, b) => {
      const pa = stopPos.get(a.key)!;
      const pb = stopPos.get(b.key)!;
      return (
        Math.hypot(pa.x - fromP.x, pa.y - fromP.y) -
        Math.hypot(pb.x - fromP.x, pb.y - fromP.y)
      );
    });
    // Two stops that would share a short label ("Carabao Park / DevCom",
    // "Carabao Park / Landbank") keep their second part to tell them apart.
    const shortCounts = new Map<string, number>();
    for (const stop of onMap) {
      const short = shortStopLabel(stop.name);
      shortCounts.set(short, (shortCounts.get(short) ?? 0) + 1);
    }
    const labelFor = (name: string) => {
      const short = shortStopLabel(name);
      return (shortCounts.get(short) ?? 0) > 1
        ? shortStopLabel(name, 2)
        : short;
    };
    byDistance.forEach((stop, rank) => {
      const p = stopPos.get(stop.key)!;
      const isNearest = nearest?.stop.key === stop.key;
      const label = labelFor(stop.name);
      if (isNearest)
        add(stop.key, label, p, 10, 10.5, bold, BRAND, 90, true, true);
      else if (stop.terminal)
        add(stop.key, label, p, markerR(stop) + 2.5, 10, bold, INK, 80, true);
      else
        add(
          stop.key,
          label,
          p,
          markerR(stop) + 2.5,
          9.5,
          font,
          INK,
          // Shared stops (transfers) before single-route ones, nearest first.
          (stop.routeIds.length > 1 ? 60 : 50) - rank * 0.01,
          // Ordinary stops drop their name where the map is crowded rather
          // than stacking leader lines; terminals and transfers keep theirs.
          stop.routeIds.length > 1,
        );
    });
    gateMarks.forEach((g, i) => {
      if (g.name)
        add(
          `gate${i}`,
          g.name,
          g.p,
          5,
          8,
          italic,
          MUTED,
          10 - i * 0.01,
          false,
          true,
        );
    });

    const bounds = {
      x: frame.x + 3,
      y: frame.y + 3,
      w: frame.w - 6,
      h: frame.h - 6,
    };
    const placed = placeLabels(specs, obstacles, bounds, lineBoxes);

    for (const spec of specs) {
      const box = placed.get(spec.id);
      if (!box) continue;
      if (box.leader) {
        const cx = Math.min(Math.max(spec.ax, box.x), box.x + box.w);
        const cy = Math.min(Math.max(spec.ay, box.y), box.y + box.h);
        const dx = cx - spec.ax;
        const dy = cy - spec.ay;
        const len = Math.hypot(dx, dy) || 1;
        page.drawLine({
          start: {
            x: spec.ax + (dx / len) * spec.gap,
            y: spec.ay + (dy / len) * spec.gap,
          },
          end: { x: cx, y: cy },
          thickness: 0.7,
          color: spec.color,
        });
      }
      const lines = spec.text.split("\n");
      lines.forEach((line, li) => {
        haloText(
          page,
          line,
          // Two-line labels left of their anchor read right-aligned.
          box.x +
            (box.x < spec.ax
              ? box.w - spec.font.widthOfTextAtSize(line, spec.size)
              : 0),
          box.y + spec.size * 0.2 + (lines.length - 1 - li) * spec.size * 1.15,
          spec.size,
          spec.font,
          spec.color,
        );
      });
    }
  } else {
    page.drawText("No active routes to map yet.", {
      x: frame.x + frame.w / 2 - 70,
      y: frame.y + frame.h / 2,
      size: 10,
      font,
      color: MUTED,
    });
  }
  // Sticker-style frame: a firm ink outline over the offset shadow drawn
  // behind the map.
  page.drawRectangle({
    x: frame.x,
    y: frame.y,
    width: frame.w,
    height: frame.h,
    borderColor: INK,
    borderWidth: 1.6,
  });

  // ── Side panel ────────────────────────────────────────────────────────
  // Cards on a soft tint, a maroon pill per section. Body text is INK or
  // BODY_TEXT (#4A4A4A, 7.6:1 or better on every route tint); no text sits
  // below WCAG AA's 4.5:1, and route lines keep 3:1 against white.
  const BODY_TEXT = rgb(0.29, 0.29, 0.29);
  const anchor = { x: 0, y: pageH };
  const px = pageW - MARGIN - PANEL_W;
  const panelFloor = FOOTER_H + 3;
  let py = pageH - HEADER_H - 8;
  const pill = (text: string) => {
    const w = bold.widthOfTextAtSize(text, 9.5) + 18;
    page.drawSvgPath(roundRectPath(px, py - 17, w, 17, 8.5, pageH), {
      ...anchor,
      color: BRAND,
    });
    page.drawText(text, {
      x: px + 9,
      y: py - 12,
      size: 9.5,
      font: bold,
      color: WHITE,
    });
    return w;
  };
  const card = (h: number, fill: RGB, stripe?: RGB) => {
    page.drawSvgPath(roundRectPath(px, py - h, PANEL_W, h, 8, pageH), {
      ...anchor,
      color: fill,
      borderColor: HAIRLINE,
      borderWidth: 0.8,
    });
    if (stripe)
      page.drawSvgPath(roundRectPath(px, py - h, 6, h, 3, pageH), {
        ...anchor,
        color: stripe,
      });
  };
  const sample = (
    color: RGB,
    dash: number[] | null,
    chevron: boolean,
    x: number,
    y: number,
    hollow = false,
  ) => {
    page.drawLine({
      start: { x, y: y + 3 },
      end: { x: x + 24, y: y + 3 },
      thickness: hollow ? 3.6 : 3,
      color,
      dashArray: dash ?? undefined,
    });
    if (hollow)
      page.drawLine({
        start: { x, y: y + 3 },
        end: { x: x + 24, y: y + 3 },
        thickness: 1.2,
        color: WHITE,
        dashArray: dash ?? undefined,
      });
    if (chevron) {
      const cx = x + 12;
      page.drawSvgPath(
        `M ${cx - 4} ${pageH - (y + 7.5)} L ${cx + 4} ${pageH - (y + 3)} L ${cx - 4} ${pageH - (y - 1.5)} Z`,
        {
          ...anchor,
          color: hollow ? WHITE : color,
          borderColor: hollow ? color : WHITE,
          borderWidth: hollow ? 1.3 : 0.8,
        },
      );
    }
  };
  const fareText = (r: { fareRegular: number; fareDiscounted: number }) =>
    Number.isFinite(r.fareRegular)
      ? `PHP ${r.fareRegular} a ride, PHP ${r.fareDiscounted} discounted`
      : "Fare not verified yet: ask the driver";
  const tint = (c: RGB) =>
    rgb(
      1 - (1 - c.red) * 0.09,
      1 - (1 - c.green) * 0.09,
      1 - (1 - c.blue) * 0.09,
    );
  const textX = px + 46;
  const textW = PANEL_W - 54;
  const BODY = 10;
  const LEAD = 11.5;

  if (drawnRoutes.length > 0) {
    // The QR tag hangs over the right of this row, so the pill sits alone.
    pill("Campus jeepneys");
    py -= 22;
    // When every route charges the same, the fare is said once on a sunny
    // badge (ink on yellow, 12.3:1) instead of on every card.
    const fares = new Set(drawnRoutes.map((r) => fareText(r)));
    const sharedFare =
      fares.size === 1 &&
      drawnRoutes.every((r) => Number.isFinite(r.fareRegular))
        ? [...fares][0]
        : null;
    if (sharedFare) {
      const bw = bold.widthOfTextAtSize(sharedFare, BODY) + 14;
      page.drawSvgPath(roundRectPath(px, py - 16, bw, 16, 8, pageH), {
        ...anchor,
        color: SUNNY,
      });
      page.drawText(sharedFare, {
        x: px + 7,
        y: py - 11.5,
        size: BODY,
        font: bold,
        color: INK,
      });
      py -= 20;
    }
    for (const route of drawnRoutes) {
      const color = hexToRgb(route.color);
      const style = styles.get(route.id);
      const loop = isLoopRoute(route);
      const [fwdName, revName] = loop
        ? route.name.split(/\s*\/\s*/)
        : [route.name, undefined];
      const fare = sharedFare ? "" : `${fareText(route)}.`;
      const fullNote = [
        loop ? "Same loop, opposite ways." : "",
        fare,
        route.boardingNote ?? "",
      ]
        .filter(Boolean)
        .join(" ");
      const lines = wrapText(fullNote, font, BODY, textW);
      const h = 17 + (loop ? 14 : 0) + lines.length * LEAD + 7;
      if (py - h < panelFloor) break;
      card(h, tint(color), color);
      let cy = py - 17;
      sample(color, loop ? null : (style?.dash ?? null), loop, px + 14, cy);
      page.drawText(fwdName ?? route.name, {
        x: textX,
        y: cy,
        size: 11,
        font: bold,
        color: INK,
      });
      if (loop) {
        cy -= 14;
        sample(
          reverseColorOf(route),
          style?.reverseDash ?? LOOP_REVERSE_DASH,
          true,
          px + 14,
          cy,
          true,
        );
        page.drawText(revName ?? `${route.name}, reverse`, {
          x: textX,
          y: cy,
          size: 11,
          font: bold,
          color: INK,
        });
      }
      cy -= 13;
      for (const line of lines) {
        page.drawText(line, {
          x: textX,
          y: cy,
          size: BODY,
          font,
          color: BODY_TEXT,
        });
        cy -= LEAD;
      }
      py -= h + 4;
    }

    // Map key.
    const keys: [string, (x: number, y: number) => void][] = [];
    if (here && hereOnMap) {
      keys.push([
        "You are here",
        (x, y) =>
          page.drawSvgPath(starPath(x + 12, pageH - (y + 3), 6), {
            ...anchor,
            color: BRAND,
          }),
      ]);
      keys.push([
        "Walk to stop",
        (x, y) =>
          page.drawLine({
            start: { x, y: y + 3 },
            end: { x: x + 24, y: y + 3 },
            thickness: 1.8,
            color: BRAND,
            dashArray: [2.5, 2.5],
          }),
      ]);
    }
    if (stops.some((st) => st.routeIds.length > 1))
      keys.push([
        "Transfer stop",
        (x, y) =>
          page.drawCircle({
            x: x + 12,
            y: y + 3,
            size: 3.6,
            color: WHITE,
            borderColor: INK,
            borderWidth: 1.9,
          }),
      ]);
    if (input.basemap)
      keys.push([
        "Campus gate",
        (x, y) =>
          page.drawRectangle({
            x: x + 9.8,
            y: y + 0.8,
            width: 4.4,
            height: 4.4,
            color: MUTED,
          }),
      ]);
    // Two columns: the panel is short on height, not width.
    const keyRows = Math.ceil(keys.length / 2);
    const keyH = 8 + keyRows * 15;
    if (keys.length > 0 && py - keyH >= panelFloor) {
      card(keyH, WHITE);
      keys.forEach(([label, icon], i) => {
        const kx = px + 10 + (i % 2) * (PANEL_W / 2);
        const ky = py - 17 - Math.floor(i / 2) * 15;
        icon(kx, ky);
        page.drawText(label, {
          x: kx + 30,
          y: ky,
          size: BODY,
          font,
          color: INK,
        });
      });
      py -= keyH + 8;
    }
  }

  // Town jeeps and buses are not drawn on the map, so they get designed
  // tiles: jeeps as a row of destination tiles with a fare chip, buses as
  // rows with an operator badge, the destination and when or where to board.
  const BUS_TEAL = rgb(0.059, 0.463, 0.431); // #0f766e, white on it 5.5:1
  const townJeeps = [
    { to: "Calamba", fare: "PHP 30", note: "25 discounted" },
    { to: "San Pablo", fare: "PHP 14+", note: "by distance" },
    { to: "Sta. Cruz", fare: "PHP 14+", note: "by distance" },
  ];
  const townBuses = [
    {
      tag: "DLTB",
      to: "Buendia",
      via: "LRT-1 Gil Puyat",
      detail: "Main gate 5 AM, back 6 PM daily",
    },
    {
      tag: "OTHERS",
      to: "Buendia",
      via: "",
      detail: "Flag down at the Junction, pay on board",
    },
    {
      tag: "DLTB",
      to: "UP Diliman",
      via: "",
      detail: "Book at dltbbus.com.ph",
    },
  ];
  const SUB_H = 14;
  const TILE_H = 39;
  const ROW_H = 24;
  const GAP = 3;
  const townH =
    4 + SUB_H + TILE_H + 4 + SUB_H + townBuses.length * (ROW_H + GAP);
  // No pill: the jeep and bus sub-heads label the card, and A4 has no
  // height to spare for one.
  if (py - townH >= panelFloor) {
    card(townH, PAPER_TINT);
    let ty = py - 4;
    const inX = px + 8;
    const inW = PANEL_W - 16;
    const subhead = (icon: () => void, text: string) => {
      icon();
      page.drawText(text, {
        x: inX + 24,
        y: ty - 10,
        size: 9,
        font: bold,
        color: INK,
      });
      ty -= SUB_H;
    };
    subhead(
      () => drawJeep(page, pageH, inX, ty - 12, 0.5, SUNNY),
      "Jeeps: board at the Junction (Olivarez)",
    );
    const tileW = (inW - GAP * (townJeeps.length - 1)) / townJeeps.length;
    townJeeps.forEach((j, i) => {
      const tx = inX + i * (tileW + GAP);
      page.drawSvgPath(
        roundRectPath(tx, ty - TILE_H, tileW, TILE_H, 6, pageH),
        {
          ...anchor,
          color: WHITE,
          borderColor: HAIRLINE,
          borderWidth: 0.8,
        },
      );
      page.drawText(j.to, {
        x: tx + 6,
        y: ty - 12,
        size: BODY,
        font: bold,
        color: INK,
      });
      const chipW = bold.widthOfTextAtSize(j.fare, 8.5) + 10;
      page.drawSvgPath(roundRectPath(tx + 5, ty - 28, chipW, 12, 6, pageH), {
        ...anchor,
        color: SUNNY,
      });
      page.drawText(j.fare, {
        x: tx + 10,
        y: ty - 24.5,
        size: 8.5,
        font: bold,
        color: INK,
      });
      if (font.widthOfTextAtSize(j.note, 7.5) <= tileW - 10)
        page.drawText(j.note, {
          x: tx + 6,
          y: ty - 35.5,
          size: 7.5,
          font,
          color: BODY_TEXT,
        });
    });
    ty -= TILE_H + 4;
    subhead(
      () => drawBus(page, pageH, inX, ty - 12, 0.5, BUS_TEAL),
      "Buses to Manila",
    );
    for (const b of townBuses) {
      page.drawSvgPath(roundRectPath(inX, ty - ROW_H, inW, ROW_H, 6, pageH), {
        ...anchor,
        color: WHITE,
        borderColor: HAIRLINE,
        borderWidth: 0.8,
      });
      const badgeW = 40;
      page.drawSvgPath(
        roundRectPath(inX + 5, ty - ROW_H + 5, badgeW, ROW_H - 10, 4, pageH),
        { ...anchor, color: BUS_TEAL },
      );
      const tagSize = b.tag.length > 4 ? 6.5 : 8;
      page.drawText(b.tag, {
        x: inX + 5 + (badgeW - bold.widthOfTextAtSize(b.tag, tagSize)) / 2,
        y: ty - ROW_H / 2 - tagSize * 0.35,
        size: tagSize,
        font: bold,
        color: WHITE,
      });
      const rx = inX + badgeW + 11;
      page.drawText(b.to, {
        x: rx,
        y: ty - 10,
        size: BODY,
        font: bold,
        color: INK,
      });
      if (b.via)
        page.drawText(b.via, {
          x: rx + bold.widthOfTextAtSize(b.to, BODY) + 5,
          y: ty - 10,
          size: 8,
          font,
          color: BODY_TEXT,
        });
      page.drawText(b.detail, {
        x: rx,
        y: ty - 19.5,
        size: 8,
        font,
        color: BODY_TEXT,
      });
      ty -= ROW_H + GAP;
    }
    py -= townH + 6;
  }

  // Riding tips, for first-years and visitors reading the sheet on a wall.
  const tips = [
    "Kaliwa turns left at the gate; Kanan, right.",
    "Board and alight at yellow stops only.",
  ];
  const tipLines = tips.map((t) => wrapText(t, font, BODY, PANEL_W - 36));
  const tipsH = 6 + tipLines.reduce((n, l) => n + l.length * LEAD + 3, 0);
  // Numbered sunny dots read as tips on their own, without a pill.
  if (py - tipsH >= panelFloor) {
    card(tipsH, WHITE);
    let ty = py - 14;
    tipLines.forEach((lines, i) => {
      page.drawCircle({
        x: px + 15,
        y: ty + 3,
        size: 6.5,
        color: SUNNY,
        borderColor: INK,
        borderWidth: 0.8,
      });
      page.drawText(String(i + 1), {
        x: px + 12.4,
        y: ty,
        size: 8.5,
        font: bold,
        color: INK,
      });
      for (const line of lines) {
        page.drawText(line, {
          x: px + 28,
          y: ty,
          size: BODY,
          font,
          color: INK,
        });
        ty -= LEAD;
      }
      ty -= 3;
    });
    py -= tipsH + 12;
  }

  // ── Footer ────────────────────────────────────────────────────────────
  // A little road with a jeep on it, then the credits.
  const roadY = FOOTER_H - 4;
  page.drawLine({
    start: { x: MARGIN + 34, y: roadY },
    end: { x: pageW - MARGIN, y: roadY },
    thickness: 1.2,
    color: HAIRLINE,
    dashArray: [6, 4],
  });
  drawJeep(page, pageH, MARGIN, roadY - 2, 0.7, SUNNY);
  page.drawText(
    `Room TBA by UPLB Tools, room-tba.uplb.tools. Printed ${dateLabel}. Prices verified Oct 7, 2026.`,
    { x: MARGIN + 34, y: 9, size: 7.5, font, color: MUTED },
  );
  const footRight = input.basemap
    ? "Map data from OpenStreetMap contributors, ODbL. Route lines and walking distances are approximate."
    : "Route lines and walking distances are approximate.";
  page.drawText(footRight, {
    x: pageW - MARGIN - font.widthOfTextAtSize(footRight, 7.5),
    y: 9,
    size: 7.5,
    font,
    color: MUTED,
  });

  return pdf.save();
}
