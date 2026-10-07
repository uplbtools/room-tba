/**
 * Printable transit map PDF for the UPLB jeepney routes.
 *
 * The frame is fitted to the campus stops and the place the map was opened
 * from, not to the full route extent: stops that fall outside it (Olivarez,
 * Robinsons) become edge arrows with their distance. A thinned OpenStreetMap
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
import { FARES_VERIFIED_NOTE } from "@constants/jeepney-routes";

export type TransitMapStop = { name: string; lat: number; lon: number };

export type TransitMapRoute = {
  id: string;
  name: string;
  color: string;
  fareRegular: number;
  fareDiscounted: number;
  directionNote: string | null;
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
/**
 * Print palettes. The sheet is taped to walls and photocopied, so the base
 * map stays pale and the routes carry the colour. `routes` overrides a
 * route's app colour on paper only (by route id).
 */
export type TransitMapPalette = "app" | "high-contrast" | "colorblind";
type PaletteSpec = {
  building: RGB;
  roadMajor: RGB;
  roadMinor: RGB;
  water: RGB;
  routes: Record<string, string>;
};
export const TRANSIT_MAP_PALETTES: Record<TransitMapPalette, PaletteSpec> = {
  // The colours riders see in the app, on a lighter base map.
  app: {
    building: rgb(0.93, 0.92, 0.9),
    roadMajor: rgb(0.82, 0.82, 0.82),
    roadMinor: rgb(0.89, 0.89, 0.89),
    water: rgb(0.78, 0.87, 0.94),
    routes: {},
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
  },
};

const MARGIN = 32;
const HEADER_H = 72;
const FOOTER_H = 24;
const PANEL_W = 222;
const PANEL_GAP = 14;

/** Straight-line distance times this is the printed walking estimate. */
export const WALK_DETOUR_FACTOR = 1.3;
/** Stops farther than this from the campus center sit outside the frame. */
const CORE_RADIUS_M = 1300;
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
 * `obstacles` and earlier labels. Labels that find no spot are dropped unless
 * `keep` is set. Returns placements by id; missing ids were dropped.
 */
export function placeLabels(
  requests: LabelRequest[],
  obstacles: Box[],
  bounds: Box,
): Map<string, PlacedLabel> {
  const placed = new Map<string, PlacedLabel>();
  const taken: Box[] = [...obstacles];
  const inside = (b: Box) =>
    b.x >= bounds.x &&
    b.y >= bounds.y &&
    b.x + b.w <= bounds.x + bounds.w &&
    b.y + b.h <= bounds.y + bounds.h;
  const free = (b: Box) => inside(b) && !taken.some((t) => overlaps(b, t));
  const sorted = [...requests].sort((a, b) => b.priority - a.priority);
  for (const r of sorted) {
    let spot: Box | undefined = labelCandidates(r).find(free);
    let leader = false;
    if (!spot && r.keep) {
      // Dense core: walk outward ring by ring and tie back with a leader.
      for (const ring of [2.2, 3.4, 4.6, 6, 7.5, 9]) {
        spot = labelCandidates(r, r.gap * ring + 6).find(free);
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
  [/·/g, ","], // interpunct
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
export function isLoopRoute(route: TransitMapRoute): boolean {
  const first = route.stops[0];
  const last = route.stops[route.stops.length - 1];
  return (
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
/** The reverse direction of a loop is dashed; the forward one is solid. */
export const LOOP_REVERSE_DASH = [5, 2.5];

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
  fonts: { regular: PDFFont; bold: PDFFont; color: RGB },
) {
  const words = runs.flatMap((run) =>
    run.text
      .split(/(\s+)/)
      .filter((w) => w.length > 0)
      .map((w) => ({ text: w, font: run.bold ? fonts.bold : fonts.regular })),
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
        color: fonts.color,
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
      const terminal = si === 0 || (!loop && si === route.stops.length - 1);
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
    name: toWinAnsi(route.name),
    directionNote: route.directionNote ? toWinAnsi(route.directionNote) : null,
    stops: route.stops.map((stop) => ({ ...stop, name: toWinAnsi(stop.name) })),
  }));
  const drawnRoutes = routes.filter(isCampusScopeRoute);
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
  raleway("UPLB Jeepney Routes", MARGIN, pageH - 33, 21, INK);

  // Brand block, top right. The sheet gets posted around campus, so the QR
  // leads back to the app; the ref param lets prints be counted.
  const qrSize = 60;
  const qrX = pageW - MARGIN - qrSize;
  const qrTop = pageH - 7;
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
  const brandRight = qrX - 10;
  const logo = await pdf.embedPng(LOGO_PNG_BASE64);
  const wordSize = 15;
  const wordW = (RALEWAY_BOLD_HEADINGS["Room TBA"].width * wordSize) / 1000;
  raleway("Room TBA", brandRight - wordW, pageH - 25, wordSize, BRAND);
  page.drawImage(logo, {
    x: brandRight - wordW - 25,
    y: pageH - 30,
    width: 23,
    height: 23,
  });
  const brandLines: [string, PDFFont, number, RGB][] = [
    ["by UPLB Tools", bold, 8.5, INK],
    ["Scan to find any room or jeep route.", font, 7.5, INK],
    ["room-tba.uplb.tools", font, 7.5, MUTED],
  ];
  brandLines.forEach(([text, fnt, size, color], i) => {
    page.drawText(text, {
      x: brandRight - fnt.widthOfTextAtSize(text, size),
      y: pageH - 38 - i * 10,
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
  drawRuns(page, intro, MARGIN, pageH - 52, introW, INTRO_SIZE, 14, 2, {
    regular: font,
    bold,
    color: INK,
  });
  page.drawRectangle({
    x: 0,
    y: pageH - HEADER_H,
    width: pageW,
    height: 3,
    color: BRAND,
  });

  // ── Map frame ─────────────────────────────────────────────────────────
  const frame: Box = {
    x: MARGIN,
    y: FOOTER_H + 8,
    w: pageW - MARGIN * 2 - PANEL_W - PANEL_GAP,
    h: pageH - HEADER_H - 10 - FOOTER_H - 8,
  };
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
    const arrows: { pts: ProjectedPoint[]; color: RGB }[] = [];
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
        borderWidth: loop ? 10.5 : 7.5,
        borderLineCap: 1,
      });
      if (loop) {
        const fwd = offsetPolyline(pts, -2.3);
        const rev = offsetPolyline([...pts].reverse(), -2.3);
        page.drawSvgPath(pathOf(fwd), {
          ...svgAnchor,
          borderColor: color,
          borderWidth: 2.4,
          borderLineCap: 1,
        });
        page.drawSvgPath(pathOf(rev), {
          ...svgAnchor,
          borderColor: darken(color, 0.62),
          borderWidth: 2.9,
          borderDashArray: style?.reverseDash ?? LOOP_REVERSE_DASH,
        });
        arrows.push(
          { pts: fwd, color },
          { pts: rev, color: darken(color, 0.62) },
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
    arrows.forEach(({ pts, color }, i) => {
      for (const { p, dir } of pointsAlong(pts, 64, 20 + i * 32)) {
        if (!inFrame(p, 4)) continue;
        const s = 3.6;
        const nx = -dir.y;
        const ny = dir.x;
        const tip = { x: p.x + dir.x * s, y: p.y + dir.y * s };
        const l = { x: p.x - dir.x * s + nx * s, y: p.y - dir.y * s + ny * s };
        const r = { x: p.x - dir.x * s - nx * s, y: p.y - dir.y * s - ny * s };
        page.drawSvgPath(`${pathOf([l, tip, r])} Z`, {
          ...svgAnchor,
          color,
          borderColor: WHITE,
          borderWidth: 0.7,
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
    const onMap = stops.filter((s) => inFrame(stopPos.get(s.key)!, 4));
    const offMap = stops.filter((s) => !inFrame(stopPos.get(s.key)!, 4));

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

    // Off-frame stops (the mall terminals): an arrow where the route leaves
    // the frame, with the stop name and its distance, instead of shrinking
    // the campus to fit them.
    const from = here && hereOnMap ? here : center;
    const fromWord = here && hereOnMap ? "from here" : "from campus";
    const exits: {
      p: ProjectedPoint;
      side: "n" | "s" | "e" | "w";
      names: string[];
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
      const label = `${stop.name}, ${formatDistance(haversineMeters(from, stop))} ${fromWord}`;
      const near = exits.find(
        (e) =>
          e.side === side && Math.hypot(e.p.x - best!.x, e.p.y - best!.y) < 60,
      );
      if (near) near.names.push(label);
      else exits.push({ p: best, side, names: [label] });
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
      const size = 7.5;
      const widths = exit.names.map((n) => bold.widthOfTextAtSize(n, size));
      const blockW = Math.max(...widths);
      const blockH = exit.names.length * (size + 2);
      // Text sits inside the frame, beside or under the arrow.
      let tx = Math.min(
        Math.max(p.x + 10, frame.x + 6),
        frame.x + frame.w - blockW - 6,
      );
      let ty = p.y - blockH - 8;
      if (side === "s") ty = p.y + 10;
      if (side === "e") {
        tx = p.x - blockW - 12;
        ty = p.y - blockH / 2;
      }
      if (side === "w") {
        tx = p.x + 12;
        ty = p.y - blockH / 2;
      }
      exit.names.forEach((n, i) => {
        haloText(
          page,
          n,
          tx,
          ty + blockH - (i + 1) * (size + 2) + 2,
          size,
          bold,
          INK,
        );
      });
      obstacles.push({ x: tx - 2, y: ty - 2, w: blockW + 4, h: blockH + 4 });
      obstacles.push({
        x: p.x - s - 2,
        y: p.y - s - 2,
        w: s * 2 + 4,
        h: s * 2 + 4,
      });
    }

    // Scale bar (bottom-left) and north arrow (top-right) reserve space
    // before labels are placed.
    const barMaxPt = 90;
    const meters = niceScaleBarMeters(barMaxPt / ptPerMeter);
    const barPt = meters * ptPerMeter;
    const barY = frame.y + 12;
    const barX = frame.x + 12;
    page.drawRectangle({
      x: barX - 4,
      y: barY - 6,
      width: barPt + 40,
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
      size: 7.5,
      font,
      color: INK,
    });
    obstacles.push({ x: barX - 4, y: barY - 6, w: barPt + 40, h: 14 });
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
    ) =>
      specs.push({
        id,
        text,
        ax: p.x,
        ay: p.y,
        gap,
        w: fnt.widthOfTextAtSize(text, size),
        h: size,
        size,
        font: fnt,
        color,
        priority,
        keep,
      });
    if (hereP && here)
      add(
        "here",
        here.name ? `${here.name} (you are here)` : "You are here",
        hereP,
        12,
        11,
        bold,
        BRAND,
        100,
        true,
      );
    const fromP = hereP ?? project(center.lat, center.lon);
    const byDistance = [...onMap].sort((a, b) => {
      const pa = stopPos.get(a.key)!;
      const pb = stopPos.get(b.key)!;
      return (
        Math.hypot(pa.x - fromP.x, pa.y - fromP.y) -
        Math.hypot(pb.x - fromP.x, pb.y - fromP.y)
      );
    });
    byDistance.forEach((stop, rank) => {
      const p = stopPos.get(stop.key)!;
      const isNearest = nearest?.stop.key === stop.key;
      if (isNearest) add(stop.key, stop.name, p, 10, 10, bold, BRAND, 90, true);
      else if (stop.terminal)
        add(
          stop.key,
          stop.name,
          p,
          markerR(stop) + 2.5,
          9,
          bold,
          INK,
          80,
          true,
        );
      else
        add(
          stop.key,
          stop.name,
          p,
          markerR(stop) + 2.5,
          8.5,
          font,
          INK,
          50 - rank * 0.01,
          // Every stop keeps its name (with a leader line when crowded):
          // a numbered key is hard to use on a sheet taped to a wall.
          true,
        );
    });
    gateMarks.forEach((g, i) => {
      if (g.name)
        add(`gate${i}`, g.name, g.p, 5, 7, italic, MUTED, 10 - i * 0.01);
    });

    const bounds = {
      x: frame.x + 3,
      y: frame.y + 3,
      w: frame.w - 6,
      h: frame.h - 6,
    };
    const placed = placeLabels(specs, obstacles, bounds);

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
      haloText(
        page,
        spec.text,
        box.x,
        box.y + spec.size * 0.2,
        spec.size,
        spec.font,
        spec.color,
      );
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
  page.drawRectangle({
    x: frame.x,
    y: frame.y,
    width: frame.w,
    height: frame.h,
    borderColor: HAIRLINE,
    borderWidth: 1,
  });

  // ── Side panel ────────────────────────────────────────────────────────
  const px = pageW - MARGIN - PANEL_W;
  let py = pageH - HEADER_H - 22;
  const heading = (text: string) => {
    page.drawText(text, { x: px, y: py, size: 11, font: bold, color: INK });
    py -= 15;
  };
  const sample = (
    color: RGB,
    dash: number[] | null,
    chevron: boolean,
    y: number,
  ) => {
    page.drawLine({
      start: { x: px, y: y + 3 },
      end: { x: px + 26, y: y + 3 },
      thickness: 2.8,
      color,
      dashArray: dash ?? undefined,
    });
    if (chevron) {
      const cx = px + 13;
      page.drawSvgPath(
        `M ${cx - 3.5} ${pageH - (y + 6.5)} L ${cx + 3.5} ${pageH - (y + 3)} L ${cx - 3.5} ${pageH - (y - 0.5)} Z`,
        { x: 0, y: pageH, color, borderColor: WHITE, borderWidth: 0.7 },
      );
    }
  };
  const fareText = (r: { fareRegular: number; fareDiscounted: number }) =>
    Number.isFinite(r.fareRegular)
      ? `PHP ${r.fareRegular} a ride, PHP ${r.fareDiscounted} student, senior or PWD`
      : "Fare not verified";

  if (drawnRoutes.length > 0) {
    heading("Campus jeepneys");
    for (const route of drawnRoutes) {
      const color = hexToRgb(route.color);
      const style = styles.get(route.id);
      if (isLoopRoute(route)) {
        const [fwdName, revName] = route.name.split(/\s*\/\s*/);
        sample(color, null, true, py);
        page.drawText(fwdName ?? route.name, {
          x: px + 34,
          y: py,
          size: 10.5,
          font: bold,
          color: INK,
        });
        py -= 14;
        sample(
          darken(color, 0.62),
          style?.reverseDash ?? LOOP_REVERSE_DASH,
          true,
          py,
        );
        page.drawText(revName ?? `${route.name}, reverse`, {
          x: px + 34,
          y: py,
          size: 10.5,
          font: bold,
          color: INK,
        });
        py -= 11;
        for (const line of wrapText(
          `Same loop, opposite directions. Arrows show the way each jeep travels. ${fareText(route)}.`,
          font,
          8.5,
          PANEL_W - 34,
        )) {
          page.drawText(line, {
            x: px + 34,
            y: py,
            size: 8.5,
            font,
            color: MUTED,
          });
          py -= 10.5;
        }
      } else {
        sample(color, style?.dash ?? null, false, py);
        page.drawText(route.name, {
          x: px + 34,
          y: py,
          size: 10.5,
          font: bold,
          color: INK,
        });
        py -= 11;
        for (const line of wrapText(
          `${fareText(route)}.`,
          font,
          8.5,
          PANEL_W - 34,
        )) {
          page.drawText(line, {
            x: px + 34,
            y: py,
            size: 8.5,
            font,
            color: MUTED,
          });
          py -= 10.5;
        }
      }
      py -= 5;
    }
    page.drawText(FARES_VERIFIED_NOTE, {
      x: px,
      y: py,
      size: 8.5,
      font: bold,
      color: INK,
    });
    py -= 15;
    // Symbols.
    if (here && hereOnMap) {
      page.drawSvgPath(starPath(px + 13, pageH - (py + 3), 6), {
        x: 0,
        y: pageH,
        color: BRAND,
      });
      page.drawText("You are here", {
        x: px + 34,
        y: py,
        size: 9.5,
        font,
        color: INK,
      });
      py -= 13;
      page.drawLine({
        start: { x: px, y: py + 3 },
        end: { x: px + 26, y: py + 3 },
        thickness: 1.6,
        color: BRAND,
        dashArray: [2.5, 2.5],
      });
      page.drawText("Walk to the nearest stop", {
        x: px + 34,
        y: py,
        size: 9.5,
        font,
        color: INK,
      });
      py -= 13;
    }
    if (stops.some((st) => st.routeIds.length > 1)) {
      page.drawCircle({
        x: px + 13,
        y: py + 3,
        size: 3.4,
        color: WHITE,
        borderColor: INK,
        borderWidth: 1.9,
      });
      page.drawText("Stop shared by two routes", {
        x: px + 34,
        y: py,
        size: 9.5,
        font,
        color: INK,
      });
      py -= 13;
    }
    if (input.basemap) {
      page.drawRectangle({
        x: px + 10.8,
        y: py + 0.8,
        width: 4.4,
        height: 4.4,
        color: MUTED,
      });
      page.drawText("Campus gate", {
        x: px + 34,
        y: py,
        size: 9.5,
        font,
        color: INK,
      });
      py -= 13;
    }
    py -= 6;
  }

  // Town jeeps and buses are not drawn; say where they are boarded and
  // that they are not campus jeeps, without listing unverified fares.
  heading("Town jeeps and buses");
  for (const line of wrapText(
    "Not on this map. Jeeps to Calamba, San Pablo and Sta. Cruz, and buses to Manila and UP Diliman, stop on the national highway at Olivarez Plaza (the Junction). UP Diliman bus tickets: dltbbus.com.ph. Details: room-tba.uplb.tools/transit",
    font,
    8.5,
    PANEL_W,
  )) {
    page.drawText(line, { x: px, y: py, size: 8.5, font, color: INK });
    py -= 11;
  }

  // ── Footer ────────────────────────────────────────────────────────────
  page.drawText(
    `Room TBA by UPLB Tools, room-tba.uplb.tools. Printed ${dateLabel}.`,
    { x: MARGIN, y: FOOTER_H - 12, size: 7.5, font, color: MUTED },
  );
  const footRight = input.basemap
    ? "Map data from OpenStreetMap contributors, ODbL. Route lines and walking distances are approximate."
    : "Route lines and walking distances are approximate.";
  page.drawText(footRight, {
    x: pageW - MARGIN - font.widthOfTextAtSize(footRight, 7.5),
    y: FOOTER_H - 12,
    size: 7.5,
    font,
    color: MUTED,
  });

  return pdf.save();
}
