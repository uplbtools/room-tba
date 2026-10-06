import { describe, expect, test } from "bun:test";
import { PDFDocument } from "pdf-lib";
import basemap from "@constants/transit-basemap.json";
import { PRINT_MAP_QR, RALEWAY_BOLD_HEADINGS } from "@constants/print-brand";
import { getTransitMapPath } from "./route-links";
import {
  findNearestStop,
  formatDistance,
  groupIntercityByOrigin,
  haversineMeters,
  isCampusScopeRoute,
  isLoopRoute,
  labelCandidates,
  placeLabels,
  pointsAlong,
  routeLineStyles,
  WALK_DETOUR_FACTOR,
  type TransitBasemap,
  makeProjector,
  metersPerDegreeLon,
  niceScaleBarMeters,
  parseHerePoint,
  renderTransitMapPdf,
  starPath,
  smoothPath,
  toWinAnsi,
  type TransitMapRoute,
} from "./transit-map-pdf";

const route = (overrides: Partial<TransitMapRoute> = {}): TransitMapRoute => ({
  id: "kaliwa-kanan",
  name: "Kaliwa / Kanan",
  color: "#dc2626",
  fareRegular: 13,
  fareDiscounted: 9,
  directionNote: "Loop through the campus core",
  stops: [
    { name: "Gate", lat: 14.1685, lon: 121.2414 },
    { name: "Palma Hall", lat: 14.1698, lon: 121.2453 },
    { name: "CEAT", lat: 14.1628, lon: 121.2497 },
  ],
  ...overrides,
});

describe("metersPerDegreeLon", () => {
  test("shrinks with latitude", () => {
    const equator = metersPerDegreeLon(0);
    const campus = metersPerDegreeLon(14.17);
    expect(equator).toBeCloseTo(111320, -2);
    expect(campus).toBeLessThan(equator);
    expect(campus).toBeGreaterThan(100_000);
  });
});

describe("makeProjector", () => {
  const frame = { x: 50, y: 50, w: 400, h: 300 };

  test("returns null with no points", () => {
    expect(makeProjector([], frame)).toBeNull();
  });

  test("fits points inside the frame and preserves aspect", () => {
    const projector = makeProjector(
      [
        { lat: 14.13, lon: 121.24 },
        { lat: 14.18, lon: 121.26 },
      ],
      frame,
    );
    expect(projector).not.toBeNull();
    const { project } = projector!;
    for (const [lat, lon] of [
      [14.13, 121.24],
      [14.18, 121.26],
      [14.155, 121.25],
    ]) {
      const p = project(lat, lon);
      expect(p.x).toBeGreaterThanOrEqual(frame.x);
      expect(p.x).toBeLessThanOrEqual(frame.x + frame.w);
      expect(p.y).toBeGreaterThanOrEqual(frame.y);
      expect(p.y).toBeLessThanOrEqual(frame.y + frame.h);
    }
    // North must stay up: a higher latitude projects to a larger y.
    const south = project(14.13, 121.25);
    const north = project(14.18, 121.25);
    expect(north.y).toBeGreaterThan(south.y);
  });
});

describe("smoothPath", () => {
  test("empty points give an empty path", () => {
    expect(smoothPath([])).toBe("");
  });

  test("two points are a straight segment", () => {
    const d = smoothPath([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ]);
    expect(d).toMatch(/^M 0 0 L 10 10$/);
  });

  test("three or more points use quadratic midpoints", () => {
    const d = smoothPath([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 0 },
    ]);
    expect(d).toContain("Q 10 10 15 5");
    expect(d.endsWith("L 20 0")).toBe(true);
  });
});

describe("starPath", () => {
  test("starts at the top point and closes", () => {
    const d = starPath(100, 100, 10);
    expect(d.startsWith("M 100 90 ")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
    expect(d.match(/L /g)).toHaveLength(9);
  });
});

describe("niceScaleBarMeters", () => {
  test("picks the largest human length that fits", () => {
    expect(niceScaleBarMeters(90)).toBe(50);
    expect(niceScaleBarMeters(260)).toBe(250);
    expect(niceScaleBarMeters(5000)).toBe(2000);
    expect(niceScaleBarMeters(10)).toBe(50);
  });
});

describe("toWinAnsi", () => {
  test("maps arrows and typography the standard fonts cannot encode", () => {
    expect(toWinAnsi("Buendia → Los Baños")).toBe("Buendia to Los Baños");
    expect(toWinAnsi("A ↔ B • C")).toBe("A <-> B - C");
  });

  test("prints em dashes, interpuncts and ellipses as plain punctuation", () => {
    expect(toWinAnsi("Buendia \u2014 Sen. Gil Puyat Ave.")).toBe(
      "Buendia, Sen. Gil Puyat Ave.",
    );
    expect(toWinAnsi("A \u00b7 B")).toBe("A , B");
    expect(toWinAnsi("Long name\u2026")).toBe("Long name");
  });

  test("drops unencodable codepoints instead of failing the render", () => {
    expect(toWinAnsi("Route \u2192 \u2603")).toBe("Route to ");
    expect(toWinAnsi("Kaliwa / Kanan")).toBe("Kaliwa / Kanan");
  });
});

describe("isCampusScopeRoute", () => {
  test("campus loop is drawn, intercity service is legend-only", () => {
    expect(
      isCampusScopeRoute(
        route({
          stops: [
            { name: "Gate", lat: 14.1685, lon: 121.2414 },
            { name: "CEAT", lat: 14.1628, lon: 121.2497 },
          ],
        }),
      ),
    ).toBe(true);
    expect(
      isCampusScopeRoute(
        route({
          name: "Buendia → Los Baños",
          stops: [
            { name: "Buendia", lat: 14.5586, lon: 121.0198 },
            { name: "LB Terminal", lat: 14.1685, lon: 121.2414 },
          ],
        }),
      ),
    ).toBe(false);
  });
});

describe("renderTransitMapPdf", () => {
  test("renders a valid PDF with metadata for two routes and a here marker", async () => {
    const bytes = await renderTransitMapPdf({
      routes: [
        route(),
        route({
          id: "forestry",
          name: "Forestry",
          color: "#15803d",
          stops: [
            { name: "Gate", lat: 14.1685, lon: 121.2414 },
            { name: "Forestry", lat: 14.148, lon: 121.2402 },
          ],
        }),
      ],
      here: { name: "Riceworld Museum", lat: 14.1684, lon: 121.2545 },
    });

    const header = Buffer.from(bytes.slice(0, 5)).toString("latin1");
    expect(header).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(2000);

    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getTitle()).toBe("UPLB Jeepney Routes");
    expect(pdf.getAuthor()).toBe("Room TBA");
  });

  test("renders the empty-state without routes", async () => {
    const bytes = await renderTransitMapPdf({ routes: [] });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getTitle()).toBeTruthy();
  });

  test("survives intercity routes with unencodable names", async () => {
    const bytes = await renderTransitMapPdf({
      routes: [
        route(),
        route({
          id: "buendia",
          name: "Buendia → Los Baños",
          stops: [
            { name: "Buendia", lat: 14.5586, lon: 121.0198 },
            { name: "LB Terminal", lat: 14.1685, lon: 121.2414 },
          ],
        }),
      ],
      here: { name: "Riceworld Museum", lat: 14.1684, lon: 121.2545 },
    });
    const header = Buffer.from(bytes.slice(0, 5)).toString("latin1");
    expect(header).toBe("%PDF-");
  });

  test("accepts the letter format", async () => {
    const a4 = await renderTransitMapPdf({ routes: [route()], format: "a4" });
    const letter = await renderTransitMapPdf({
      routes: [route()],
      format: "letter",
    });
    const a4pdf = await PDFDocument.load(a4);
    const letterPdf = await PDFDocument.load(letter);
    const a4size = a4pdf.getPage(0).getSize();
    const lsize = letterPdf.getPage(0).getSize();
    expect(lsize.width).toBeCloseTo(792, 0);
    expect(lsize.height).toBeCloseTo(612, 0);
    expect(a4size.width).toBeGreaterThan(lsize.width);
    expect(a4size.height).toBeLessThan(lsize.height);
  });
});

describe("nearest stop", () => {
  test("haversine matches a known distance", () => {
    // One degree of latitude is about 111.2 km.
    expect(
      haversineMeters({ lat: 14, lon: 121 }, { lat: 15, lon: 121 }),
    ).toBeCloseTo(111195, -2);
    expect(
      haversineMeters({ lat: 14.1, lon: 121.2 }, { lat: 14.1, lon: 121.2 }),
    ).toBe(0);
  });

  test("picks the closest stop and pads the walk by the detour factor", () => {
    const here = { lat: 14.1644, lon: 121.2412 }; // E-Kitchen Food Truck
    const stops = [
      { name: "Main Library", lat: 14.16544, lon: 121.2386 },
      { name: "Graduate School / Umali", lat: 14.16374, lon: 121.23999 },
      { name: "Makiling School", lat: 14.16574, lon: 121.24426 },
    ];
    const nearest = findNearestStop(here, stops);
    expect(nearest?.stop.name).toBe("Graduate School / Umali");
    expect(nearest?.straightM).toBeGreaterThan(130);
    expect(nearest?.straightM).toBeLessThan(160);
    expect(nearest?.walkM).toBeCloseTo(
      (nearest?.straightM ?? 0) * WALK_DETOUR_FACTOR,
      6,
    );
  });

  test("returns null without stops", () => {
    expect(findNearestStop({ lat: 14, lon: 121 }, [])).toBeNull();
  });

  test("formats distances without false precision", () => {
    expect(formatDistance(3)).toBe("10 m");
    expect(formatDistance(187)).toBe("190 m");
    expect(formatDistance(1349)).toBe("1.3 km");
  });
});

describe("placeLabels", () => {
  const bounds = { x: 0, y: 0, w: 500, h: 500 };
  const req = (
    id: string,
    ax: number,
    ay: number,
    priority: number,
    keep = false,
  ) => ({
    id,
    ax,
    ay,
    gap: 4,
    w: 60,
    h: 8,
    priority,
    keep,
  });
  const overlap = (
    a: { x: number; y: number; w: number; h: number },
    b: { x: number; y: number; w: number; h: number },
  ) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  test("offers 8 distinct positions around the anchor", () => {
    const c = labelCandidates(req("a", 100, 100, 1));
    expect(c).toHaveLength(8);
    expect(new Set(c.map((b) => `${b.x}:${b.y}`)).size).toBe(8);
  });

  test("moves a colliding label to another position instead of overlapping", () => {
    const placed = placeLabels(
      [req("a", 100, 100, 2), req("b", 104, 100, 1)],
      [],
      bounds,
    );
    const a = placed.get("a")!;
    const b = placed.get("b")!;
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    expect(overlap(a, b)).toBe(false);
  });

  test("drops the lower-priority label when no position is free, keeps kept ones", () => {
    // A wall of obstacles around (100, 100) leaves no free spot nearby.
    const wall = [{ x: 0, y: 0, w: 500, h: 500 }];
    const placed = placeLabels(
      [req("terminal", 100, 100, 80, true), req("minor", 100, 100, 10)],
      wall,
      bounds,
    );
    expect(placed.has("terminal")).toBe(true);
    expect(placed.has("minor")).toBe(false);
  });

  test("higher priority wins the contested spot", () => {
    const placed = placeLabels(
      [req("low", 100, 100, 1), req("high", 100, 100, 9)],
      [],
      { x: 100 + 4, y: 100 - 4, w: 60, h: 8 }, // only the right-hand slot fits
    );
    expect(placed.has("high")).toBe(true);
    expect(placed.has("low")).toBe(false);
  });

  test("keeps labels inside the frame bounds", () => {
    const placed = placeLabels([req("edge", 495, 250, 5)], [], bounds);
    const box = placed.get("edge")!;
    expect(box.x + box.w).toBeLessThanOrEqual(500);
  });
});

describe("groupIntercityByOrigin", () => {
  const r = (id: string, name: string, fare: number): TransitMapRoute =>
    route({
      id,
      name,
      fareRegular: fare,
      fareDiscounted: Math.round(fare * 0.8),
      stops: [
        { name: "Start", lat: 14.17, lon: 121.24 },
        { name: "End", lat: 14.5, lon: 121.0 },
      ],
    });

  test("groups by origin with the larger group first, one route per row", () => {
    const groups = groupIntercityByOrigin([
      r("buendia-to-lb", "Buendia → Los Baños", 165),
      r("lb-to-calamba", "Los Baños → Calamba", 20),
      r("lb-to-sta-cruz", "Los Baños → Sta. Cruz", 50),
      r("uplb-to-upd", "UPLB → UP Diliman (DLTB Commuter Bus)", 165),
    ]);
    expect(groups.map((g) => g.origin)).toEqual([
      "Los Baños",
      "Buendia",
      "UPLB",
    ]);
    expect(groups[0].routes.map((x) => x.destination)).toEqual([
      "Calamba",
      "Sta. Cruz",
    ]);
    expect(groups[0].routes[0].fareRegular).toBe(20);
    expect(groups[2].routes[0].destination).toBe(
      "UP Diliman (DLTB Commuter Bus)",
    );
  });

  test("falls back to first and last stop when the name has no arrow", () => {
    const [g] = groupIntercityByOrigin([r("x", "Bay shuttle", 30)]);
    expect(g.origin).toBe("Start");
    expect(g.routes[0].destination).toBe("End");
  });
});

describe("route styles", () => {
  test("Kaliwa / Kanan is a loop, Forestry is not", () => {
    const loop = route({
      stops: [
        { name: "Olivarez", lat: 14.179, lon: 121.239 },
        { name: "Gate", lat: 14.1677, lon: 121.2416 },
        { name: "Library", lat: 14.1654, lon: 121.2386 },
        { name: "Olivarez", lat: 14.179, lon: 121.239 },
      ],
    });
    expect(isLoopRoute(loop)).toBe(true);
    expect(isLoopRoute(route())).toBe(false);
  });

  test("every drawn line has a distinct dash pattern for grayscale prints", () => {
    const loop = route({
      id: "kaliwa-kanan",
      stops: [
        { name: "Olivarez", lat: 14.179, lon: 121.239 },
        { name: "Gate", lat: 14.1677, lon: 121.2416 },
        { name: "Olivarez", lat: 14.179, lon: 121.239 },
      ],
    });
    const styles = routeLineStyles([
      loop,
      route({ id: "forestry" }),
      route({ id: "third" }),
    ]);
    // Solid (null) counts as a pattern too; a loop also has its reverse line.
    const patterns = [...styles.values()].flatMap((s) => [
      JSON.stringify(s.dash),
      ...(s.reverseDash ? [JSON.stringify(s.reverseDash)] : []),
    ]);
    expect(patterns).toHaveLength(4);
    expect(new Set(patterns).size).toBe(patterns.length);
  });
});

describe("pointsAlong", () => {
  test("spaces arrow points along the line in travel order", () => {
    const pts = pointsAlong(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      40,
      10,
    );
    expect(pts.map((p) => p.p.x)).toEqual([10, 50, 90]);
    expect(pts[0].dir).toEqual({ x: 1, y: 0 });
  });
});

describe("renderTransitMapPdf with the OSM basemap", () => {
  test("stays small enough to print and send", async () => {
    const t0 = performance.now();
    const bytes = await renderTransitMapPdf({
      routes: [route()],
      here: { name: "E-Kitchen Food Truck", lat: 14.1644, lon: 121.2412 },
      basemap: basemap as TransitBasemap,
    });
    expect(performance.now() - t0).toBeLessThan(3000);
    expect(bytes.length).toBeLessThan(500 * 1024);
  });
});

describe("any point as You are here", () => {
  const params = (query: string) => new URLSearchParams(query);

  test("the app link round-trips through the API parser", () => {
    const path = getTransitMapPath({
      lat: 14.164812,
      lon: 121.241703,
      name: "Main Library",
    });
    const parsed = parseHerePoint(new URL(path, "https://x").searchParams);
    expect(parsed).toEqual({
      name: "Main Library",
      lat: 14.16481,
      lon: 121.2417,
    });
  });

  test("a dropped pin has no name", () => {
    const path = getTransitMapPath({ lat: 14.16, lon: 121.24 });
    expect(path).not.toContain("name=");
    expect(parseHerePoint(new URL(path, "https://x").searchParams)).toEqual({
      name: null,
      lat: 14.16,
      lon: 121.24,
    });
  });

  test("no point, or a half or bogus one", () => {
    expect(parseHerePoint(params("here=Riceworld"))).toBeNull();
    expect(parseHerePoint(params("lat=14.16"))).toBe("invalid");
    expect(parseHerePoint(params("lat=abc&lon=121"))).toBe("invalid");
    expect(parseHerePoint(params("lat=95&lon=121"))).toBe("invalid");
  });

  test("names are trimmed, capped and stripped of control characters", () => {
    const parsed = parseHerePoint(
      params(
        `lat=14&lon=121&name=${encodeURIComponent(`  A\u0007B${"x".repeat(100)}`)}`,
      ),
    );
    expect(parsed).not.toBe("invalid");
    const name = (parsed as { name: string }).name;
    expect(name.startsWith("AB")).toBe(true);
    expect(name.length).toBe(80);
  });

  test("a name with no printable characters falls back to the star", async () => {
    const bytes = await renderTransitMapPdf({
      routes: [route()],
      here: { name: "\u6559\u5ba4", lat: 14.1644, lon: 121.2412 },
    });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });

  test("renders a nameless point near campus", async () => {
    const bytes = await renderTransitMapPdf({
      routes: [route()],
      here: { lat: 14.1644, lon: 121.2412 },
      basemap: basemap as TransitBasemap,
    });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
  });
});

describe("print branding", () => {
  test("the QR grid is square and the headings were baked", () => {
    expect(PRINT_MAP_QR.length).toBeGreaterThanOrEqual(21);
    for (const row of PRINT_MAP_QR) {
      expect(row).toMatch(/^[01]+$/);
      expect(row.length).toBe(PRINT_MAP_QR.length);
    }
    expect(
      RALEWAY_BOLD_HEADINGS["UPLB Jeepney Routes"].d.length,
    ).toBeGreaterThan(100);
    expect(RALEWAY_BOLD_HEADINGS["Room TBA"].width).toBeGreaterThan(0);
  });
});
