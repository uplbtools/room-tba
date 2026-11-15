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
  LineJoinStyle,
  PDFDocument,
  StandardFonts,
  TextRenderingMode,
  clip,
  endPath,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  rgb,
  setLineJoin,
  setLineWidth,
  setStrokingColor,
  setTextRenderingMode,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import {
  LOGO_PNG_BASE64,
  PRINT_MAP_QR,
  RALEWAY_BOLD_HEADINGS,
  SIGNBOARD_GLYPHS,
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
  /** Closed rings: woods and lawns, sports fields, ponds. */
  green?: [number, number][][];
  fields?: [number, number][][];
  lakes?: [number, number][][];
  gates: { name: string; lat: number; lon: number }[];
};

export type TransitMapFormat = "a4" | "letter" | "a3";
/** The sheet is two landscape pages; the poster is one portrait page. */
export type TransitMapLayout = "sheet" | "poster";

const PAGE_SIZES: Record<TransitMapFormat, { w: number; h: number }> = {
  a4: { w: 841.89, h: 595.28 },
  letter: { w: 792, h: 612 },
  a3: { w: 1190.55, h: 841.89 },
};

const BRAND = rgb(0.49, 0.179, 0.15); // hsl(5, 53%, 32%), the Room TBA maroon
// Pure black prints as solid toner; a dark grey comes out as halftone dots.
const INK = rgb(0, 0, 0);
const MUTED = rgb(0.4, 0.4, 0.4);
const HAIRLINE = rgb(0.8, 0.8, 0.8);
const WHITE = rgb(1, 1, 1);
// On the maroon band SOFT_ON_BRAND (#F6E3E0) is 7.4:1 and white is 9.2:1.
const SOFT_ON_BRAND = rgb(0.965, 0.89, 0.878);
// A jeepney signboard: black acrylic with a pale cut edge and painted capitals.
const BOARD = rgb(0.071, 0.067, 0.059);
const BOARD_EDGE = rgb(0.95, 0.8, 0.65);
const SIGN_GREEN = rgb(0.33, 0.76, 0.17);
const SIGN_YELLOW = rgb(0.94, 0.84, 0.12);
const SIGN_RED = rgb(0.94, 0.31, 0.18);
/**
 * Print palettes. The sheet is taped to walls and photocopied, so the base
 * map stays pale and the routes carry the colour. `routes` overrides a
 * route's app colour on paper only (by route id); `loopReverse` gives a
 * loop's reverse direction (Kaliwa) its own hue, so it never reads as Kanan.
 */
export type TransitMapPalette =
  | "paper"
  | "app"
  | "high-contrast"
  | "colorblind";
type PaletteSpec = {
  building: RGB;
  roadMajor: RGB;
  roadMinor: RGB;
  water: RGB;
  /** Fill under the map; white when unset. */
  land?: RGB;
  green?: RGB;
  field?: RGB;
  /** Outline under the roads, for pale roads on a tinted land. */
  roadCasing?: RGB;
  routes: Record<string, string>;
  loopReverse: Record<string, string>;
};
export const TRANSIT_MAP_PALETTES: Record<TransitMapPalette, PaletteSpec> = {
  // The default: warm land, soft greens and white roads under deep routes.
  paper: {
    land: rgb(0.972, 0.957, 0.925),
    green: rgb(0.89, 0.925, 0.83),
    field: rgb(0.83, 0.9, 0.76),
    building: rgb(0.9, 0.86, 0.79),
    roadMajor: WHITE,
    roadMinor: WHITE,
    roadCasing: rgb(0.83, 0.8, 0.74),
    water: rgb(0.62, 0.8, 0.92),
    routes: {
      "kaliwa-kanan": "#B71C1C",
      forestry: "#E65100",
      "up-rural": "#0D47A1",
    },
    loopReverse: { "kaliwa-kanan": "#6A1B9A" },
  },
  // The colours riders see in the app, on a lighter base map.
  app: {
    building: rgb(0.93, 0.92, 0.9),
    roadMajor: rgb(0.82, 0.82, 0.82),
    roadMinor: rgb(0.89, 0.89, 0.89),
    water: rgb(0.78, 0.87, 0.94),
    routes: {},
    loopReverse: { "kaliwa-kanan": "#7B1FA2" },
  },
  // The same route colours on a near-white base: survives a cheap printer.
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
const HEADER_H = 84;
const FOOTER_H = 30;
const PANEL_W = 250;
const PANEL_GAP = 14;
// Most printers cannot ink the outer 6 mm, so no text or art sits there.
const SAFE = 18;
const KEY_H = 18;
/** Height of the stop strips under the poster's map. */
const POSTER_STRIPS_H: Record<TransitMapFormat, number> = {
  a4: 310,
  letter: 300,
  a3: 580,
};

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
): { q: ProjectedPoint; d: number; dir: ProjectedPoint } {
  let best = {
    q: pts[0] ?? p,
    d: Number.POSITIVE_INFINITY,
    dir: { x: 1, y: 0 },
  };
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
    if (d < best.d) {
      const len = Math.sqrt(len2);
      best = { q, d, dir: { x: dx / len, y: dy / len } };
    }
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
  // Line samples are wider than the stroke, so a 1 pt graze is fine.
  const clear = (b: Box) => {
    const core = { x: b.x + 1, y: b.y + 1, w: b.w - 2, h: b.h - 2 };
    return free(b) && !lines.some((t) => overlaps(core, t));
  };
  // A leader for a line-clear label must not cross lines or labels either.
  const leaderClear = (r: LabelRequest, b: Box, overLines = false) => {
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
      if (!overLines && lines.some((o) => overlaps(dot, o))) return false;
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
    let spot: Box | undefined = r.clearOfLines
      ? pick(r.spots ?? labelCandidates(r))
      : labelCandidates(r).find(clear);
    let leader = false;
    // A stop label steps out on a leader before it settles on a line.
    for (const ring of spot || r.clearOfLines ? [] : [2.2, 3.4, 4.6]) {
      spot = labelCandidates(r, r.gap * ring + 6).find(
        (b) => clear(b) && leaderClear(r, b, true),
      );
      if (spot) {
        leader = true;
        break;
      }
    }
    if (!r.clearOfLines) spot ??= labelCandidates(r).find(free);
    if (!spot && r.keep) {
      // An edge-exit label stays by its arrow, over a line if it must.
      spot = r.spots?.find(free);
      // Dense core: walk outward ring by ring and tie back with a leader.
      for (const ring of spot ? [] : [2.2, 3.4, 4.6, 6, 7.5, 9]) {
        spot = pick(labelCandidates(r, r.gap * ring + 6), true);
        if (spot) {
          leader = true;
          break;
        }
      }
      // Over a line before over a marker or another label.
      spot ??= slid(r, labelCandidates(r, r.gap * 2.2 + 6)).find(free);
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

/** Black or white, whichever reads better on a fill. */
function textOn(c: RGB): RGB {
  const lin = (v: number) =>
    v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  const l = 0.2126 * lin(c.red) + 0.7152 * lin(c.green) + 0.0722 * lin(c.blue);
  return l > 0.179 ? INK : WHITE;
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

/** A closed route driven one way only, such as the e-jeep loop. */
function isOneWayLoop(route: TransitMapRoute): boolean {
  const first = route.stops[0];
  const last = route.stops[route.stops.length - 1];
  return (
    !isLoopRoute(route) &&
    route.stops.length >= 3 &&
    first.name === last.name &&
    haversineMeters(first, last) < 60
  );
}

/** Lane centers (pt from a loop's centerline) for single lines on its road. */
const SIDE_LANES = [7.5, -7, 12.1, -11.6];
/** A single line this close to a loop line counts as on the same road. */
const SIDE_LANE_SNAP = 5;

/**
 * Moves each single line into a lane beside any loop line it shares a road
 * with, so neither hides the other. Singles that also share a road with each
 * other take different lanes. A line that never meets a loop is returned as is.
 */
export function sideLaneLines(
  singles: ProjectedPoint[][],
  loops: ProjectedPoint[][],
): ProjectedPoint[][] {
  const laned: { raw: ProjectedPoint[]; lane: number }[] = [];
  return singles.map((pts) => {
    const raw = pointsAlong(pts, 2, 0).map((s) => s.p);
    const onLoop = raw.map((p) =>
      loops
        .map((loop) => nearestOnPolyline(loop, p))
        .find((near) => near.d <= SIDE_LANE_SNAP),
    );
    if (onLoop.filter(Boolean).length < 10) return pts;
    const taken = new Set(
      laned
        .filter(
          (other) =>
            raw.filter(
              (p) => nearestOnPolyline(other.raw, p).d <= SIDE_LANE_SNAP,
            ).length >= 10,
        )
        .map((other) => other.lane),
    );
    const lane = SIDE_LANES.findIndex((_, i) => !taken.has(i));
    if (lane < 0) return pts;
    laned.push({ raw, lane });
    const offset = SIDE_LANES[lane];
    return raw.map((p, i) => {
      const near = onLoop[i];
      return near
        ? {
            x: near.q.x - near.dir.y * offset,
            y: near.q.y + near.dir.x * offset,
          }
        : p;
    });
  });
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
      // Per character: widthOfTextAtSize kerns pairs that drawText does not.
      for (const ch of word.text) cx += word.font.widthOfTextAtSize(ch, size);
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
const LEADER_GAP = 3;
const EXIT_TAG_PAD = 2.5;

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
  page.pushOperators(
    pushGraphicsState(),
    setTextRenderingMode(TextRenderingMode.Outline),
    setStrokingColor(WHITE),
    setLineWidth(2.6),
    setLineJoin(LineJoinStyle.Round),
  );
  page.drawText(text, { x, y, size, font, color: WHITE });
  page.pushOperators(popGraphicsState());
  page.drawText(text, { x, y, size, font, color });
}

const SIGNBOARD_CAP = 0.628;
const SIGNBOARD_TRACKING = 30;

/** Splits a route name into the board's two paint colours. */
export function signboardWords(name: string): [string, string] {
  const [first = "", ...rest] = name
    .toUpperCase()
    .split(/\s*[/(]\s*/)
    .map((part) => part.replace(/[^A-Z0-9&.\-' ]/g, "").trim())
    .filter(Boolean);
  return [first, rest.join(" ")];
}

function signboardUnits(text: string) {
  return [...text].reduce(
    (sum, ch) => sum + (SIGNBOARD_GLYPHS[ch]?.width ?? 0) + SIGNBOARD_TRACKING,
    0,
  );
}

/** Lettering size and board width for `words` on a board `h` tall. */
function signboardLayout(
  words: [string, string],
  h: number,
  maxW: number,
  stack = false,
) {
  const texts = words.filter(Boolean);
  if (stack) {
    const pad = h * 0.16;
    const widest = Math.max(...texts.map((t) => signboardUnits(t)));
    const size = Math.min(
      (h * 0.29) / SIGNBOARD_CAP,
      ((maxW - pad * 2) * 1000) / widest,
    );
    return { pad, gap: 0, size, w: (widest * size) / 1000 + pad * 2 };
  }
  const pad = h * 0.32;
  const units = signboardUnits;
  const gap = SIGNBOARD_GLYPHS[" "].width * 1.4;
  const total =
    texts.reduce((sum, text) => sum + units(text), 0) +
    gap * (texts.length - 1);
  const size = Math.min(
    (h * 0.58) / SIGNBOARD_CAP,
    ((maxW - pad * 2) * 1000) / total,
  );
  return { pad, gap, size, w: (total * size) / 1000 + pad * 2 };
}

/**
 * A jeepney signboard, `h` tall with its top-left corner at (x, top): shadowed
 * capitals on a black board. With `cup` it hangs from a windshield suction
 * cup. With `stack` each word gets its own line. Returns the board's width.
 */
function drawSignboard(
  page: PDFPage,
  pageH: number,
  words: [string, string],
  x: number,
  top: number,
  h: number,
  maxW: number,
  paint: [RGB, RGB] = [SIGN_GREEN, SIGN_YELLOW],
  cup = false,
  stack = false,
): number {
  const { pad, gap, size, w } = signboardLayout(words, h, maxW, stack);
  const runs = words
    .map((text, i) => ({ text, color: paint[i] }))
    .filter((run) => run.text);
  const edge = Math.max(0.7, h * 0.045);
  page.drawSvgPath(roundRectPath(x, top - h, w, h, h * 0.09, pageH), {
    x: 0,
    y: pageH,
    color: BOARD,
    borderColor: BOARD_EDGE,
    borderWidth: edge,
  });
  const hole = { x: x + w / 2, y: top - h * 0.13 };
  if (cup) {
    const r = h * 0.3;
    const cy = top + r * 0.75;
    page.drawCircle({
      x: hole.x,
      y: cy,
      size: r,
      color: rgb(0.93, 0.95, 0.93),
      opacity: 0.55,
      borderColor: WHITE,
      borderWidth: 0.6,
      borderOpacity: 0.9,
    });
    page.drawCircle({ x: hole.x, y: cy, size: r * 0.3, color: INK });
    page.drawLine({
      start: { x: hole.x, y: cy },
      end: hole,
      thickness: 0.8,
      color: INK,
    });
    page.drawCircle({ ...hole, size: h * 0.045, color: BOARD_EDGE });
  }
  const depth = size * 0.055;
  let cx = x + pad;
  runs.forEach((run, line) => {
    const mid = stack ? top - (h / 4) * (2 * line + 1) : top - h / 2;
    const baseline = mid - (size * SIGNBOARD_CAP) / 2 - h * 0.03;
    if (stack) cx = x + (w - (signboardUnits(run.text) * size) / 1000) / 2;
    for (const ch of run.text) {
      const glyph = SIGNBOARD_GLYPHS[ch];
      if (!glyph) continue;
      if (glyph.d) {
        page.drawSvgPath(glyph.d, {
          x: cx + depth,
          y: baseline - depth,
          scale: size / 1000,
          color: darken(run.color, 0.38),
        });
        page.drawSvgPath(glyph.d, {
          x: cx,
          y: baseline,
          scale: size / 1000,
          color: run.color,
        });
      }
      cx += ((glyph.width + SIGNBOARD_TRACKING) * size) / 1000;
    }
    cx += (gap * size) / 1000;
  });
  return w;
}

/** Ordinal list "A", "A and B", "A, B and C". */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} at ${names[names.length - 1]}`;
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

/** The codes on the stop signs around campus, forward direction first. */
const LINE_CODES: Record<string, string[]> = {
  "kaliwa-kanan": ["KN", "KL"],
  forestry: ["FR"],
  snodlob: ["LOOP"],
  "up-rural": ["RURAL"],
};

type StripLine = {
  route: TransitMapRoute;
  color: RGB;
  /** Set on a two-way loop: the colour of its reverse direction. */
  reverse: RGB | null;
};

/** Cut text with "..." so it fits a width. */
function fitText(text: string, font: PDFFont, size: number, maxW: number) {
  if (font.widthOfTextAtSize(text, size) <= maxW) return text;
  let cut = text;
  while (cut.length > 1 && font.widthOfTextAtSize(`${cut}...`, size) > maxW)
    cut = cut.slice(0, -1);
  return `${cut.trimEnd()}...`;
}

/** Every campus line as a strip of its stops, in travel order. */
function drawStopStrips(
  page: PDFPage,
  o: {
    pageH: number;
    font: PDFFont;
    bold: PDFFont;
    lines: StripLine[];
    box: { x: number; top: number; w: number; bottom: number };
    stops: MapStop[];
    nearest: MapStop | null;
  },
) {
  const { pageH, font, bold, lines, box } = o;
  const anchor = { x: 0, y: pageH };
  const GAP = 14;
  const cols: { x: number; w: number; bottom: number }[] = [];
  const INDENT = 20;
  const maxStops = Math.max(...lines.map((l) => l.route.stops.length));
  // Tight rows set each name on one line; roomy rows let a name wrap.
  const roomy = (box.top - box.bottom - 50) / maxStops >= 19;
  const HEAD_H = roomy ? 68 : 48;
  const NAME = roomy ? 10 : 9;
  const HEAD = roomy ? 11.5 : 10;
  const k = roomy ? 1 : 0.8;
  const rowH = Math.min(22, (box.top - box.bottom - HEAD_H) / maxStops);
  // Columns share the width by their longest stop name.
  const want = lines.map(
    (l) =>
      INDENT +
      Math.min(
        170,
        Math.max(
          l.reverse ? 110 : 90,
          ...l.route.stops.map((s) =>
            font.widthOfTextAtSize(shortStopLabel(s.name, 2), NAME),
          ),
        ),
      ),
  );
  const free = box.w - (lines.length - 1) * GAP;
  const total = want.reduce((sum, w) => sum + w, 0);
  let x = box.x;
  lines.forEach((line, ci) => {
    const { route, color, reverse } = line;
    const colW = (want[ci]! / total) * free;
    const { top } = box;
    const codes = LINE_CODES[route.id] ?? [];
    // "Kaliwa / Kanan" lists its stops in Kanan order.
    const names = reverse
      ? route.name.split(/\s*\/\s*/).reverse()
      : [route.name.replace(/\s*(\/|\().*$/, "")];
    const bandH = HEAD * 2;
    const halfW = colW / names.length;
    names.forEach((name, i) => {
      const c = i === 1 && reverse ? reverse : color;
      const bx = x + i * halfW;
      page.drawRectangle({
        x: bx,
        y: top - bandH,
        width: halfW - (i < names.length - 1 ? 2 : 0),
        height: bandH,
        color: c,
      });
      page.drawText(
        [
          [codes[i], name].filter(Boolean).join("  "),
          name,
          codes[i] ?? name,
        ].find((t) => bold.widthOfTextAtSize(t, HEAD) <= halfW - 10) ??
          fitText(name, bold, HEAD, halfW - 10),
        {
          x: bx + 5,
          y: top - bandH / 2 - HEAD * 0.36,
          size: HEAD,
          font: bold,
          color: textOn(c),
        },
      );
    });
    const oneWay = isOneWayLoop(route);
    const fareY = top - bandH - HEAD - 4;
    if (Number.isFinite(route.fareRegular)) {
      const fare = `PHP ${route.fareRegular}`;
      page.drawText(fare, {
        x,
        y: fareY,
        size: HEAD + 2,
        font: bold,
        color: INK,
      });
      page.drawText(`, ${route.fareDiscounted} discounted`, {
        x: x + bold.widthOfTextAtSize(fare, HEAD + 2),
        y: fareY,
        size: NAME,
        font,
        color: INK,
      });
    } else
      page.drawText(
        fitText("Itanong sa driver ang pamasahe", font, NAME, colW),
        {
          x,
          y: fareY,
          size: NAME,
          font,
          color: INK,
        },
      );
    if (roomy)
      page.drawText(
        fitText(
          reverse
            ? `${names[0]} pababa, ${names[1]} pataas.`
            : oneWay
              ? "One way lang, paikot."
              : "Same stops pabalik.",
          font,
          NAME,
          colW,
        ),
        { x, y: fareY - 14, size: NAME, font, color: INK },
      );

    const last = route.stops.length - 1;
    const cy = (i: number) => top - HEAD_H - rowH * (i + 0.5);
    const lx = x + (reverse ? 10 : 6) * k;
    const rx = x + 3 * k;
    const arrow = (ax: number, y: number, dir: 1 | -1, half: number, c: RGB) =>
      page.drawSvgPath(
        `M ${ax - half} ${pageH - (y + dir * half * 0.7)} L ${ax + half} ${pageH - (y + dir * half * 0.7)} L ${ax} ${pageH - (y - dir * half * 0.7)} Z`,
        { ...anchor, color: c },
      );
    if (reverse) {
      for (const [thickness, c] of [
        [3.4 * k, reverse],
        [1.2 * k, WHITE],
      ] as const)
        page.drawLine({
          start: { x: rx, y: cy(0) },
          end: { x: rx, y: cy(last) },
          thickness,
          color: c,
        });
    }
    page.drawLine({
      start: { x: lx, y: cy(0) },
      end: { x: lx, y: cy(last) },
      thickness: 6 * k,
      color,
    });
    for (let i = 0; i < last; i++) {
      const mid = (cy(i) + cy(i + 1)) / 2;
      if (oneWay || (reverse && i % 2 === 0)) arrow(lx, mid, 1, 2.4 * k, WHITE);
      if (reverse && i % 2 === 1) arrow(rx, mid, -1, 3.2 * k, reverse);
    }

    route.stops.forEach((stop, i) => {
      const y = cy(i);
      const merged = o.stops.find((m) => haversineMeters(m, stop) < 30);
      const isHere = !!merged && merged === o.nearest;
      const terminal = i === 0 || i === last;
      if (reverse)
        page.drawSvgPath(
          roundRectPath(
            x + 0.5 * k,
            y - 3.5 * k,
            13 * k,
            7 * k,
            3.5 * k,
            pageH,
          ),
          {
            ...anchor,
            color: WHITE,
            borderColor: INK,
            borderWidth: (terminal ? 1.8 : 1.1) * k,
          },
        );
      else
        page.drawCircle({
          x: lx,
          y,
          size: (terminal ? 4.6 : 3.8) * k,
          color: WHITE,
          borderColor: color,
          borderWidth: (terminal ? 2.2 : 1.6) * k,
        });

      const nx = x + INDENT * k;
      const f = terminal || isHere ? bold : font;
      const nameW = x + colW - nx;
      let text = roomy
        ? wrapText(stop.name, f, NAME, nameW)
        : [fitText(shortStopLabel(stop.name, 2), f, NAME, nameW)];
      // A wrapped name is set a little smaller so two in a row stay apart.
      const size = text.length > 1 ? 8.8 : NAME;
      if (text.length > 1) text = wrapText(stop.name, f, size, nameW);
      if (text.length > 2)
        text = wrapText(shortStopLabel(stop.name), f, size, nameW).slice(0, 2);
      const lead = size + 0.5;
      if (isHere) {
        const w = Math.max(...text.map((l) => f.widthOfTextAtSize(l, size)));
        const h = text.length * lead + 3;
        page.drawSvgPath(roundRectPath(nx - 3, y - h / 2, w + 6, h, 2, pageH), {
          ...anchor,
          color,
        });
      }
      text.forEach((l, j) =>
        page.drawText(l, {
          x: nx,
          y:
            y +
            (text.length === 2 ? lead / 2 - size * 0.36 + 0.5 : -size * 0.36) -
            j * lead,
          size,
          font: f,
          color: isHere ? WHITE : INK,
        }),
      );
    });
    cols.push({ x, w: colW, bottom: cy(last) - rowH / 2 });
    x += colW + GAP;
  });
  return cols;
}

export async function renderTransitMapPdf(input: {
  routes: TransitMapRoute[];
  here?: TransitMapHere | null;
  basemap?: TransitBasemap | null;
  format?: TransitMapFormat;
  layout?: TransitMapLayout;
  generatedAt?: Date;
  palette?: TransitMapPalette;
}): Promise<Uint8Array> {
  const format = input.format ?? "a4";
  const poster = input.layout === "poster";
  const size = PAGE_SIZES[format];
  const pageW = poster ? size.h : size.w;
  const pageH = poster ? size.w : size.h;
  const generatedAt = input.generatedAt ?? new Date();
  const palette = TRANSIT_MAP_PALETTES[input.palette ?? "paper"];

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
  page.drawRectangle({
    x: 0,
    y: pageH - HEADER_H + 10,
    width: pageW,
    height: HEADER_H - 10,
    color: BRAND,
  });

  const titleW = drawSignboard(
    page,
    pageH,
    ["UPLB", "JEEPNEY ROUTES"],
    MARGIN,
    pageH - SAFE - 14,
    26,
    pageW,
    [SIGN_YELLOW, SIGN_GREEN],
    true,
  );

  // The QR is about 3 cm wide so it scans from a step back on a wall. Its
  // ref param lets prints be counted.
  const qrSize = 88;
  const qrX = pageW - MARGIN - 6 - qrSize;
  const qrTop = pageH - SAFE - 2;
  const tagBottom = qrTop - qrSize - 6;
  page.drawSvgPath(
    roundRectPath(
      qrX - 6,
      tagBottom,
      qrSize + 12,
      qrTop + 6 - tagBottom,
      3,
      pageH,
    ),
    {
      x: 0,
      y: pageH,
      color: WHITE,
      borderColor: MUTED,
      borderWidth: 0.6,
    },
  );
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
  raleway("Room TBA", brandRight - wordW, pageH - 37, wordSize, WHITE);
  page.drawSvgPath(
    roundRectPath(brandRight - wordW - 28, pageH - 42, 24, 24, 6, pageH),
    {
      x: 0,
      y: pageH,
      color: WHITE,
    },
  );
  page.drawImage(logo, {
    x: brandRight - wordW - 27,
    y: pageH - 41,
    width: 22,
    height: 22,
  });
  const brandLines: [string, PDFFont, number, RGB][] = [
    ["by UPLB Tools", font, 10, WHITE],
    ["room-tba.uplb.tools", bold, 10, WHITE],
  ];
  brandLines.forEach(([text, fnt, size, color], i) => {
    page.drawText(text, {
      x: brandRight - fnt.widthOfTextAtSize(text, size),
      y: pageH - 53 - i * 12.5,
      size,
      font: fnt,
      color,
    });
  });
  const brandW = Math.max(
    wordW + 25,
    ...brandLines.map(([text, fnt, size]) => fnt.widthOfTextAtSize(text, size)),
  );
  const introX = MARGIN + titleW + 16;
  const introW = brandRight - brandW - 16 - introX;

  // Vercel runs in UTC; without the zone, sheets printed before 8 AM in
  // Los Baños carry yesterday's date.
  const dateLabel = generatedAt.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Manila",
  });
  const FOOT = 9;
  const footLeft = `Designed by Simonee Ezekiel Mariquit. Na-print noong ${dateLabel}. Na-verify ang presyo noong Oct 7, 2026.`;
  const footRight = input.basemap
    ? "Map data from OpenStreetMap contributors, ODbL. Approximate lang ang mga linya at layo."
    : "Approximate lang ang mga linya at layo.";
  // When the two footer lines don't fit side by side they stack.
  const stacked =
    font.widthOfTextAtSize(footLeft, FOOT) +
      font.widthOfTextAtSize(footRight, FOOT) +
      20 >
    pageW - MARGIN * 2;
  const footerH = FOOTER_H + (stacked && !poster ? 11 : 0);
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
      { text: "Nandito ka sa " },
      { text: here.name ?? "star sa map na ito", bold: true },
      { text: ". Pinakamalapit na jeepney stop ang " },
      { text: nearest.stop.name, bold: true },
      {
        text: `, mga ${formatDistance(nearest.walkM)} na lakad lang. Dumadaan dito ang `,
      },
      { text: servedBy, bold: true },
      { text: "." },
    ];
  } else if (here) {
    intro = [
      {
        text: `Mga ${formatDistance(haversineMeters(here, center))} from campus ang `,
      },
      { text: here.name ?? "spot na ito", bold: true },
      {
        text: ", kaya wala ito sa map. Nasa routes pa rin kung paano pumunta ng UPLB.",
      },
    ];
  } else {
    intro = [
      { text: "Mga jeepney route sa campus at kung saan sila humihinto." },
    ];
  }
  const INTRO_SIZE = 11;
  const INTRO_LEAD = 13.5;
  const introLines = Math.min(
    4,
    wrapText(intro.map((r) => r.text).join(""), bold, INTRO_SIZE, introW)
      .length,
  );
  // Centred on the title board, which hangs below its suction cup.
  const introY =
    pageH - SAFE - 26 + ((introLines - 1) * INTRO_LEAD) / 2 - INTRO_SIZE * 0.36;
  if (poster)
    // Beside the QR tag, in the gap between the header and the map.
    drawRuns(
      page,
      intro,
      MARGIN,
      pageH - HEADER_H - 5,
      qrX - 24 - MARGIN,
      INTRO_SIZE,
      INTRO_LEAD,
      3,
      { regular: font, bold, color: INK, boldColor: BRAND },
    );
  else
    drawRuns(page, intro, introX, introY, introW, INTRO_SIZE, INTRO_LEAD, 4, {
      regular: font,
      bold,
      color: SOFT_ON_BRAND,
      boldColor: WHITE,
    });

  // ── Map frame ─────────────────────────────────────────────────────────
  const keyH = (here && hereOnMap) || poster ? KEY_H : 0;
  // The poster has no side panel: the stop strips sit under the map.
  const stripsTop = FOOTER_H + 20 + POSTER_STRIPS_H[format];
  const frame: Box = poster
    ? {
        x: MARGIN,
        y: stripsTop + 14 + keyH,
        w: pageW - MARGIN * 2,
        h: tagBottom - 6 - stripsTop - 14 - keyH,
      }
    : {
        x: MARGIN,
        y: footerH + 8 + keyH,
        w: pageW - MARGIN * 2 - PANEL_W - PANEL_GAP,
        h: pageH - HEADER_H - 10 - footerH - 8 - keyH,
      };
  page.drawRectangle({
    x: frame.x,
    y: frame.y,
    width: frame.w,
    height: frame.h,
    color: palette.land ?? WHITE,
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
      const green = palette.green && layerPath(b.green ?? [], true);
      if (green)
        page.drawSvgPath(green, { ...svgAnchor, color: palette.green });
      const fields = palette.field && layerPath(b.fields ?? [], true);
      if (fields)
        page.drawSvgPath(fields, { ...svgAnchor, color: palette.field });
      const lakes = layerPath(b.lakes ?? [], true);
      if (lakes)
        page.drawSvgPath(lakes, { ...svgAnchor, color: palette.water });
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
      const major = layerPath(b.roadsMajor, false);
      if (palette.roadCasing) {
        if (minor)
          page.drawSvgPath(minor, {
            ...svgAnchor,
            borderColor: palette.roadCasing,
            borderWidth: 2.1,
            borderLineCap: 1,
          });
        if (major)
          page.drawSvgPath(major, {
            ...svgAnchor,
            borderColor: palette.roadCasing,
            borderWidth: 4.1,
            borderLineCap: 1,
          });
      }
      if (minor)
        page.drawSvgPath(minor, {
          ...svgAnchor,
          borderColor: palette.roadMinor,
          borderWidth: 1.1,
          borderLineCap: 1,
        });
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

    // Routes: every white casing first, then the lines, so no casing erases
    // another route. Loops draw both travel directions side by side
    // (right-hand traffic: each on its own right). A single line that shares
    // a road with a loop runs in its own lane beside it.
    const routeLines = new Map<string, ProjectedPoint[]>();
    const arrows: { pts: ProjectedPoint[]; color: RGB; hollow: boolean }[] = [];
    const loopLines: ProjectedPoint[][] = [];
    for (const route of drawnRoutes) {
      const source =
        route.line && route.line.length >= 2 ? route.line : route.stops;
      const pts = source.map(proj);
      routeLines.set(route.id, pts);
      if (isLoopRoute(route)) loopLines.push(pts);
    }
    const singles = drawnRoutes.filter((route) => !isLoopRoute(route));
    sideLaneLines(
      singles.map((route) => routeLines.get(route.id)!),
      loopLines,
    ).forEach((pts, i) => routeLines.set(singles[i].id, pts));
    for (const route of drawnRoutes) {
      page.drawSvgPath(pathOf(routeLines.get(route.id)!), {
        ...svgAnchor,
        borderColor: WHITE,
        borderWidth: isLoopRoute(route) ? 12 : 7.5,
        borderLineCap: 1,
      });
    }
    for (const route of drawnRoutes) {
      const pts = routeLines.get(route.id)!;
      const color = hexToRgb(route.color);
      const style = styles.get(route.id);
      if (isLoopRoute(route)) {
        // Kanan solid with filled arrows; Kaliwa its own hue, dashed and
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
        if (isOneWayLoop(route)) arrows.push({ pts, color, hollow: false });
      }
    }
    // Direction chevrons in travel order, offset so the two directions do
    // not stack their arrows at the same spot.
    arrows.forEach(({ pts, color, hollow }, i) => {
      for (const { p, dir } of pointsAlong(pts, 48, 20 + i * 24)) {
        if (!inFrame(p, 4)) continue;
        const s = 5.2;
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
    // so a road-routed line and its stops never visibly disagree. A stop
    // shared with a loop sits on the loop, between the lanes beside it.
    const loopIds = drawnRoutes.filter(isLoopRoute).map((r) => r.id);
    const stopPos = new Map<string, ProjectedPoint>();
    for (const stop of stops) {
      const raw = proj(stop);
      const line = routeLines.get(
        stop.routeIds.find((id) => loopIds.includes(id)) ?? stop.routeIds[0],
      );
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
    const markerR = (s: MapStop) => (s.terminal ? 6 : 3.4);
    for (const stop of onMap) {
      const p = stopPos.get(stop.key)!;
      const shared = stop.routeIds.length > 1;
      const route = drawnRoutes.find((r) => r.id === stop.routeIds[0]);
      const r = markerR(stop);
      const ring = shared ? INK : hexToRgb(route?.color ?? "#333333");
      page.drawCircle({
        x: p.x,
        y: p.y,
        size: r,
        color: stop.terminal ? ring : WHITE,
        borderColor: stop.terminal ? WHITE : ring,
        borderWidth: stop.terminal ? 1.4 : shared ? 1.9 : 1.4,
      });
      if (stop.terminal)
        page.drawCircle({ x: p.x, y: p.y, size: 2.2, color: WHITE });
      obstacles.push({ x: p.x - r, y: p.y - r, w: r * 2, h: r * 2 });
    }
    for (const g of gateMarks) {
      page.drawRectangle({
        x: g.p.x - 3.5,
        y: g.p.y - 3.5,
        width: 7,
        height: 7,
        color: INK,
        borderColor: WHITE,
        borderWidth: 1,
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

    // Line codes on the map, as far from stops and each other as the line allows.
    const pillAt: ProjectedPoint[] = onMap.map((s) => stopPos.get(s.key)!);
    const clearance = (p: ProjectedPoint) =>
      Math.min(...pillAt.map((q) => Math.hypot(p.x - q.x, p.y - q.y)));
    for (const route of drawnRoutes) {
      const spots = pointsAlong(routeLines.get(route.id)!, 20, 10)
        .map(({ p }) => p)
        .filter((p) => inFrame(p, 24));
      const codes = (LINE_CODES[route.id] ?? []).slice(
        0,
        isLoopRoute(route) ? 2 : 1,
      );
      codes.forEach((code, i) => {
        if (spots.length === 0) return;
        const p = spots.reduce((a, b) => (clearance(b) > clearance(a) ? b : a));
        pillAt.push(p);
        const c = i === 1 ? reverseColorOf(route) : hexToRgb(route.color);
        const w = bold.widthOfTextAtSize(code, 9) + 9;
        page.drawSvgPath(roundRectPath(p.x - w / 2, p.y - 7, w, 14, 7, pageH), {
          ...svgAnchor,
          color: c,
          borderColor: WHITE,
          borderWidth: 1.4,
        });
        page.drawText(code, {
          x: p.x - w / 2 + 4.5,
          y: p.y - 3.2,
          size: 9,
          font: bold,
          color: textOn(c),
        });
        obstacles.push({ x: p.x - w / 2, y: p.y - 7, w, h: 14 });
      });
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
    const barBoxW = barPt + 46;
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
      y: barY - 3.5,
      size: 9.5,
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
      x: nx - 3.4,
      y: ny + 12,
      size: 9.5,
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
        11.5,
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
        bold.widthOfTextAtSize(textOf(picked), 10) > 270
      )
        picked.pop();
      const spec = add(
        `exit${i}`,
        textOf(picked),
        exit.p,
        10,
        10,
        bold,
        INK,
        // Top and bottom exits have fewer spots, so they pick first.
        exit.side === "n" || exit.side === "s" ? 96 : 95,
        true,
        true,
      );
      spec.w += 4 * EXIT_TAG_PAD;
      spec.h += 2 * EXIT_TAG_PAD;
      // Beside the arrow along its edge, sliding away until clear of lines.
      const { x, y } = exit.p;
      const { w, h } = spec;
      const vertical = exit.side === "n" || exit.side === "s";
      const spots: Box[] = [];
      for (let k = 0; k <= 6; k++) {
        const off = 10 + k * 12;
        const pairs: [number, number][] = vertical
          ? [
              y - h / 2,
              exit.side === "n" ? y - 12 - h : y + 12,
              // One row further in, for when two exits share a corner.
              exit.side === "n" ? y - 15 - 2 * h : y + 15 + h,
            ].flatMap((by): [number, number][] => [
              [x + off, by],
              [x - off - w, by],
            ])
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
        add(stop.key, label, p, 10, 11, bold, BRAND, 90, true, true);
      else if (stop.terminal)
        add(stop.key, label, p, markerR(stop) + 4, 11.5, bold, INK, 80, true);
      else
        add(
          stop.key,
          label,
          p,
          markerR(stop) + 4,
          10,
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
          9,
          italic,
          INK,
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
      const cx = Math.min(Math.max(spec.ax, box.x), box.x + box.w);
      const cy = Math.min(Math.max(spec.ay, box.y), box.y + box.h);
      const dx = cx - spec.ax;
      const dy = cy - spec.ay;
      const len = Math.hypot(dx, dy) || 1;
      const from = Math.min(Math.max(spec.gap - LEADER_GAP, 3.5), len);
      const start = {
        x: spec.ax + (dx / len) * from,
        y: spec.ay + (dy / len) * from,
      };
      const end = { x: cx, y: cy };
      page.drawLine({ start, end, thickness: 2.6, color: WHITE });
      page.drawLine({ start, end, thickness: 0.9, color: spec.color });
      if (spec.spots)
        page.drawRectangle({
          x: box.x,
          y: box.y,
          width: box.w,
          height: box.h,
          color: WHITE,
          borderColor: spec.color,
          borderWidth: 0.8,
        });
      const lines = spec.text.split("\n");
      lines.forEach((line, li) => {
        haloText(
          page,
          line,
          // Two-line labels left of their anchor read right-aligned.
          box.x +
            (spec.spots
              ? 2 * EXIT_TAG_PAD
              : box.x < spec.ax
                ? box.w - spec.font.widthOfTextAtSize(line, spec.size)
                : 0),
          box.y +
            (spec.spots ? EXIT_TAG_PAD : 0) +
            spec.size * 0.2 +
            (lines.length - 1 - li) * spec.size * 1.15,
          spec.size,
          spec.font,
          spec.color,
        );
      });
    }
  } else {
    page.drawText("Wala pang active na route na pwedeng i-map.", {
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
    borderColor: MUTED,
    borderWidth: 0.6,
  });

  // ── Side panel ────────────────────────────────────────────────────────
  const anchor = { x: 0, y: pageH };
  const px = pageW - MARGIN - PANEL_W;
  const panelFloor = footerH + 6;
  const BODY = 10.5;
  const LEAD = 13;
  let py = pageH - HEADER_H - 8;
  const heading = (text: string) => {
    page.drawText(text, {
      x: px,
      y: py - 12,
      size: 13,
      font: bold,
      color: INK,
    });
    py -= 18;
  };
  const line = (text: string, x = px, fnt = font) => {
    page.drawText(text, { x, y: py - 8.5, size: BODY, font: fnt, color: INK });
    py -= LEAD;
  };
  const rule = () => {
    page.drawLine({
      start: { x: px, y: py },
      end: { x: px + PANEL_W, y: py },
      thickness: 0.6,
      color: HAIRLINE,
    });
    py -= 9;
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
      ? `PHP ${r.fareRegular} ang pamasahe, PHP ${r.fareDiscounted} pag discounted`
      : "Di pa verified ang pamasahe, tanong muna sa driver";
  const textX = px + 34;
  const textW = PANEL_W - 34;
  const BOARD_H = 19;

  if (drawnRoutes.length > 0) {
    if (!poster) {
      heading("Jeeps sa campus");
      // The QR tag hangs into the top of the panel.
      py = Math.min(py, tagBottom - 5);
      const fares = new Set(drawnRoutes.map((r) => fareText(r)));
      const sharedFare =
        fares.size === 1 &&
        drawnRoutes.every((r) => Number.isFinite(r.fareRegular))
          ? [...fares][0]
          : null;
      if (sharedFare) {
        line(`${sharedFare}.`);
        line("Sa yellow stops lang pwedeng sumakay at bumaba.");
        py -= 6;
      }
      for (const route of drawnRoutes) {
        const color = hexToRgb(route.color);
        const style = styles.get(route.id);
        const loop = isLoopRoute(route);
        // "Kaliwa / Kanan" lists its stops in Kanan order.
        const names = loop
          ? route.name.split(/\s*\/\s*/).reverse()
          : [route.name];
        if (loop && names.length < 2) names.push(`${route.name} reverse`);
        // Each board has its name in plain type too, beside it when it fits.
        const boards = names.slice(0, 2).map((name) => {
          const words = signboardWords(name);
          const w = signboardLayout(words, BOARD_H, textW).w;
          const beside = w + 8 + bold.widthOfTextAtSize(name, BODY) <= textW;
          return { name, words, w, beside };
        });
        const fare = sharedFare ? "" : `${fareText(route)}.`;
        const note = [
          loop ? "Iisa ang loop nila." : "",
          fare,
          route.boardingNote ?? "",
        ]
          .filter(Boolean)
          .join(" ");
        const lines = wrapText(note, font, BODY, textW);
        const h =
          boards.reduce(
            (sum, b) => sum + BOARD_H + 3 + (b.beside ? 0 : LEAD),
            0,
          ) +
          lines.length * LEAD;
        if (py - h < panelFloor) break;
        boards.forEach((b, i) => {
          const reverse = i === 1;
          sample(
            reverse ? reverseColorOf(route) : color,
            reverse
              ? (style?.reverseDash ?? LOOP_REVERSE_DASH)
              : loop
                ? null
                : (style?.dash ?? null),
            loop,
            px,
            py - BOARD_H / 2 - 3,
            reverse,
          );
          drawSignboard(page, pageH, b.words, textX, py, BOARD_H, textW);
          if (b.beside)
            page.drawText(b.name, {
              x: textX + b.w + 8,
              y: py - BOARD_H / 2 - 3.6,
              size: BODY,
              font: bold,
              color: INK,
            });
          py -= BOARD_H + 3;
          if (!b.beside) line(b.name, textX, bold);
        });
        for (const l of lines) line(l, textX);
        py -= 7;
      }
    }

    // Map key, in one row under the map.
    const keys: [string, (x: number, y: number) => void][] = [];
    if (poster)
      for (const route of drawnRoutes) {
        const loop = isLoopRoute(route);
        const dash = styles.get(route.id)?.dash ?? null;
        const codes = LINE_CODES[route.id] ?? [];
        const names = loop
          ? route.name.split(/\s*\/\s*/).reverse()
          : [route.name.replace(/\s*(\/|\().*$/, "")];
        names
          .slice(0, loop ? 2 : 1)
          .forEach((name, i) =>
            keys.push([
              [codes[i], name].filter(Boolean).join(" "),
              (x, y) =>
                i === 1
                  ? sample(
                      reverseColorOf(route),
                      styles.get(route.id)?.reverseDash ?? LOOP_REVERSE_DASH,
                      true,
                      x,
                      y,
                      true,
                    )
                  : sample(
                      hexToRgb(route.color),
                      loop ? null : dash,
                      loop || isOneWayLoop(route),
                      x,
                      y,
                    ),
            ]),
          );
      }
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
    let kx = frame.x;
    const ky = frame.y - KEY_H + 5;
    const used = keys.reduce(
      (sum, [label]) => sum + 30 + font.widthOfTextAtSize(label, BODY),
      0,
    );
    const keyGap = Math.min(
      24,
      (frame.w - used) / Math.max(1, keys.length - 1),
    );
    for (const [label, icon] of keys) {
      icon(kx, ky);
      page.drawText(label, {
        x: kx + 30,
        y: ky,
        size: BODY,
        font,
        color: INK,
      });
      kx += 30 + font.widthOfTextAtSize(label, BODY) + keyGap;
    }
  }

  // Town jeeps and buses are not drawn on the map, so they are listed.
  const townJeeps = ["Crossing / SM Calamba", "San Pablo", "Sta. Cruz"];
  const townTexts = [
    "Mula PHP 14 ang pamasahe, depende sa layo.",
    "PHP 30 ang pa-SM Calamba (Crossing), 25 discounted.",
  ];
  const busTexts = [
    "May DLTB bus papuntang UP Diliman, 5 AM, 1 PM at 6 PM ang alis sa UPLB.",
    "Pabalik, 5 AM, 9 AM at 6 PM ang alis galing UP Diliman.",
    "May DLTB bus din pa-Buendia sa CPark, 5:30 AM ang alis.",
    "PHP 197, Lunes hanggang Sabado. Mag-book sa dltb.ph.",
    "Sa Olivarez Plaza Mall, abangan lang ang bus pa-Buendia sa bus stop.",
  ];
  const townLines = townTexts.flatMap((t) => wrapText(t, font, BODY, PANEL_W));
  const busLines = busTexts.flatMap((t) => wrapText(t, font, BODY, PANEL_W));
  const TOWN_BOARD_H = 15;
  // Town boards flow left to right and wrap. Returns the rows' height.
  const townBoards = (
    pg: PDFPage | null,
    x: number,
    top: number,
    w: number,
    boardH = TOWN_BOARD_H,
  ) => {
    let bx = x;
    let rowTop = top;
    let rowH = 0;
    for (const town of townJeeps) {
      const stack = town.includes("/");
      const h = stack ? boardH * 1.5 : boardH;
      const words = signboardWords(town);
      const bw = signboardLayout(words, h, w, stack).w;
      if (bx > x && bx + bw > x + w) {
        bx = x;
        rowTop -= rowH + 4;
        rowH = 0;
      }
      if (pg)
        drawSignboard(
          pg,
          pageH,
          words,
          bx,
          rowTop,
          h,
          w,
          [SIGN_RED, SIGN_RED],
          false,
          stack,
        );
      rowH = Math.max(rowH, h);
      bx += bw + 6;
    }
    return top - rowTop + rowH;
  };
  const townH =
    9 +
    21 +
    townBoards(null, 0, 0, PANEL_W, 12) +
    4 +
    townLines.length * LEAD +
    8 +
    20 +
    busLines.length * LEAD;
  if (!poster && py - townH >= panelFloor) {
    rule();
    heading("Jeeps sa Olivarez Plaza Mall");
    py -= 3;
    py -= townBoards(page, px, py, PANEL_W, 12) + 4;
    for (const l of townLines) line(l);
    py -= 8;
    heading("Bus pa-Manila");
    py -= 2;
    for (const l of busLines) line(l);
  }

  // ── Footer ────────────────────────────────────────────────────────────
  page.drawText(footLeft, {
    x: MARGIN,
    y: SAFE + 2,
    size: FOOT,
    font,
    color: INK,
  });
  page.drawText(footRight, {
    x: stacked
      ? MARGIN
      : pageW - MARGIN - font.widthOfTextAtSize(footRight, FOOT),
    y: SAFE + 2 + (stacked ? 11 : 0),
    size: FOOT,
    font,
    color: INK,
  });

  const strips = {
    pageH,
    font,
    bold,
    lines: drawnRoutes.map((route) => ({
      route,
      color: hexToRgb(route.color),
      reverse: isLoopRoute(route) ? reverseColorOf(route) : null,
    })),
    stops,
    nearest: nearest?.stop ?? null,
  };
  if (drawnRoutes.length > 0 && poster) {
    const floor = FOOTER_H + 14;
    const cols = drawStopStrips(page, {
      ...strips,
      box: { x: MARGIN, top: stripsTop, w: pageW - MARGIN * 2, bottom: floor },
    });
    // The rest of the guide fills the space under the shorter stop lists.
    type Section = { title: string; texts: string[]; towns: string[] };
    type Draw = (
      pg: PDFPage | null,
      x: number,
      top: number,
      w: number,
    ) => number;
    type Block = {
      prefer: number;
      band?: string;
      sections: Section[];
      custom?: Draw;
    };
    const blocks: Block[] = [
      ...drawnRoutes.flatMap((route, i) =>
        route.boardingNote
          ? [
              {
                prefer: i,
                sections: [
                  {
                    title: isLoopRoute(route)
                      ? "Kanan o Kaliwa"
                      : `Saan sasakay ng ${route.name.replace(/\s*(\/|\().*$/, "")}`,
                    texts: [route.boardingNote],
                    towns: isLoopRoute(route)
                      ? ["Olivarez", "Junction", "Bayan"]
                      : [],
                  },
                ],
              },
            ]
          : [],
      ),
      {
        prefer: -1,
        band: "Palabas ng campus",
        sections: [],
        // Draws when given a page, and returns its height either way.
        custom: (pg, x, top, w) => {
          let y = top;
          const text = (t: string, tx: number, size: number, f: PDFFont) => {
            pg?.drawText(t, { x: tx, y, size, font: f, color: INK });
            return f.widthOfTextAtSize(t, size);
          };
          const title = (t: string) => {
            y -= HEAD;
            text(t, x, HEAD, bold);
            y -= 5;
          };
          // A board with its note beside it, or under it when there's no room.
          const board = (name: string, paint: RGB, note: string) => {
            const words = signboardWords(name);
            const bw = signboardLayout(words, TOWN_BOARD_H, w).w;
            if (pg)
              drawSignboard(pg, pageH, words, x, y, TOWN_BOARD_H, w, [
                paint,
                paint,
              ]);
            const beside = bw + 6 + bold.widthOfTextAtSize(note, BODY) <= w;
            y -= TOWN_BOARD_H;
            if (beside) {
              const ny = y;
              y += TOWN_BOARD_H / 2 - BODY * 0.36;
              text(note, x + bw + 6, BODY, bold);
              y = ny - 4;
            } else {
              y -= LEAD;
              text(note, x, BODY, bold);
              y -= 4;
            }
          };
          const fare = (label: string, amount: string, rest: string) => {
            y -= LEAD;
            let tx = x;
            const full =
              font.widthOfTextAtSize(`${label} ${rest}`, BODY) +
              bold.widthOfTextAtSize(amount, BODY + 1.5);
            if (label && full > w) {
              text(label, x, BODY, font);
              y -= LEAD;
            } else if (label) tx += text(`${label} `, tx, BODY, font);
            tx += text(amount, tx, BODY + 1.5, bold);
            text(rest, tx, BODY, font);
          };

          title("Jeeps sa Olivarez Plaza Mall");
          y -= townBoards(pg, x, y, w) + 2;
          fare("", "PHP 14", " pataas, depende sa layo");
          fare("", "PHP 30", " pa-Crossing, 25 discounted");

          y -= 14;
          title("Bus pa-Manila");
          // Departure times from UPLB as dark chips.
          const chips = (times: string[]) => {
            y -= 2;
            let cx = x;
            for (const time of times) {
              const cw = bold.widthOfTextAtSize(time, BODY) + 10;
              pg?.drawSvgPath(roundRectPath(cx, y - 18, cw, 15, 3, pageH), {
                x: 0,
                y: pageH,
                color: BOARD,
              });
              pg?.drawText(time, {
                x: cx + 5,
                y: y - 14,
                size: BODY,
                font: bold,
                color: WHITE,
              });
              cx += cw + 5;
            }
            y -= 18;
          };
          y -= LEAD - 3;
          text("PHP 197, Lunes hanggang Sabado.", x, BODY, font);
          y -= LEAD;
          text("Mag-book sa dltb.ph.", x, BODY, font);
          y -= 8;
          board("UP Diliman", SIGN_YELLOW, "DLTB");
          chips(["5 AM", "1 PM", "6 PM"]);
          for (const l of wrapText(
            "Pabalik galing UPD 5 AM, 9 AM at 6 PM.",
            font,
            BODY,
            w,
          )) {
            y -= LEAD;
            text(l, x, BODY, font);
          }
          y -= 10;
          board("Buendia", SIGN_YELLOW, "DLTB sa CPark");
          chips(["5:30 AM"]);
          y -= 4;
          for (const l of wrapText(
            "Sa Olivarez, abangan lang sa bus stop ang bus pa-Buendia.",
            font,
            BODY,
            w,
          )) {
            y -= LEAD;
            text(l, x, BODY, font);
          }
          y -= 4;
          return top - y;
        },
      },
    ];
    const HEAD = 11.5;
    const BAND = HEAD * 2;
    const BOARD_GAP = 6;
    const layoutSection = (sec: Section, w: number) => {
      const lines = sec.texts.flatMap((t) => wrapText(t, font, BODY, w));
      // Boards flow left to right and wrap to a new row.
      let bx = 0;
      let rows = sec.towns.length ? 1 : 0;
      const at = sec.towns.map((t) => {
        const bw = signboardLayout(signboardWords(t), TOWN_BOARD_H, w).w;
        if (bx > 0 && bx + bw > w) {
          bx = 0;
          rows++;
        }
        const pos = { x: bx, row: rows - 1 };
        bx += bw + BOARD_GAP;
        return pos;
      });
      const boardsH = rows * (TOWN_BOARD_H + 4);
      const titles = wrapText(sec.title, bold, HEAD, w);
      return {
        lines,
        titles,
        at,
        boardsH,
        h: titles.length * 14 + 2 + boardsH + lines.length * LEAD,
      };
    };
    const blockH = (block: Block, w: number) =>
      (block.band ? BAND + 8 : 0) +
      (block.custom?.(null, 0, 0, w) ?? 0) +
      block.sections.reduce(
        (sum, sec, i) => sum + layoutSection(sec, w).h + (i > 0 ? 8 : 0),
        0,
      );
    const place = (
      pg: PDFPage,
      list: Block[],
      columns: { x: number; w: number; bottom: number }[],
    ) =>
      list.filter((block) => {
        const fits = (c: (typeof columns)[number]) =>
          c.bottom - 12 - blockH(block, c.w) >= floor;
        const own = columns[block.prefer];
        const col =
          own && fits(own)
            ? own
            : columns.filter(fits).sort((p, q) => p.bottom - q.bottom)[0];
        if (!col) return true;
        let y = col.bottom - 12;
        if (block.band) {
          pg.drawRectangle({
            x: col.x,
            y: y - BAND,
            width: col.w,
            height: BAND,
            color: BOARD,
          });
          pg.drawText(block.band, {
            x: col.x + 5,
            y: y - BAND / 2 - HEAD * 0.36,
            size: HEAD,
            font: bold,
            color: WHITE,
          });
          y -= BAND + 8;
        }
        if (block.custom) y -= block.custom(pg, col.x, y, col.w);
        block.sections.forEach((sec, si) => {
          if (si > 0) y -= 8;
          const { lines, titles, at, boardsH } = layoutSection(sec, col.w);
          for (const t of titles) {
            pg.drawText(t, {
              x: col.x,
              y: y - HEAD,
              size: HEAD,
              font: bold,
              color: INK,
            });
            y -= 14;
          }
          y -= 2;
          sec.towns.forEach((town, i) =>
            drawSignboard(
              pg,
              pageH,
              signboardWords(town),
              col.x + at[i]!.x,
              y - at[i]!.row * (TOWN_BOARD_H + 4),
              TOWN_BOARD_H,
              col.w,
              [SIGN_GREEN, SIGN_GREEN],
            ),
          );
          y -= boardsH;
          for (const l of lines) {
            pg.drawText(l, {
              x: col.x,
              y: y - 9,
              size: BODY,
              font,
              color: INK,
            });
            y -= LEAD;
          }
        });
        col.bottom = y;
        return false;
      });
    const left = place(page, blocks, cols);
    // Whatever is left goes on a second page in three columns.
    if (left.length > 0) {
      const more = pdf.addPage([pageW, pageH]);
      const w = (pageW - MARGIN * 2 - 2 * 14) / 3;
      place(
        more,
        left.map((block) => ({ ...block, prefer: -1 })),
        [0, 1, 2].map((i) => ({
          x: MARGIN + i * (w + 14),
          w,
          bottom: pageH - SAFE,
        })),
      );
    }
  } else if (drawnRoutes.length > 0) {
    // Page 2 of the sheet: the same strips at full size.
    const BAND_H = 52;
    const guide = pdf.addPage([pageW, pageH]);
    guide.drawRectangle({
      x: 0,
      y: pageH - BAND_H,
      width: pageW,
      height: BAND_H,
      color: BRAND,
    });
    const boardW = drawSignboard(
      guide,
      pageH,
      ["UPLB", "JEEPNEY STOPS"],
      MARGIN,
      pageH - SAFE,
      24,
      pageW,
      [SIGN_YELLOW, SIGN_GREEN],
    );
    guide.drawText(
      `Top to bottom ang order ng stops.${nearest ? " Naka-box yung stop na pinakamalapit sa'yo." : ""}`,
      {
        x: MARGIN + boardW + 20,
        y: pageH - SAFE - 16,
        size: 11,
        font,
        color: SOFT_ON_BRAND,
      },
    );
    drawStopStrips(guide, {
      ...strips,
      box: {
        x: MARGIN,
        top: pageH - BAND_H - 14,
        w: pageW - MARGIN * 2,
        bottom: FOOTER_H + 6,
      },
    });
    guide.drawText(footLeft, {
      x: MARGIN,
      y: SAFE + 2,
      size: FOOT,
      font,
      color: INK,
    });
  }

  return pdf.save();
}
