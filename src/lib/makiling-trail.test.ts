import { describe, expect, test } from "bun:test";
import {
  MAKILING_PEAK_2_PLACE,
  MAKILING_TRAILHEAD_PLACE,
  MAKILING_TRAIL_STOPS,
} from "@constants/makiling-trail";
import { MAKILING_TRAIL_PATH } from "@constants/makiling-trail-path";
import {
  cumulativeDistances,
  elevationGain,
  findTrailStop,
  formatHours,
  formatKm,
  getTrailStops,
  getTrailSummary,
  haversineMeters,
  hikeDifficulty,
  naismithHours,
  projectOntoPath,
  sampleProfile,
  searchTrail,
  stationLabel,
  trailStopForPlace,
  type TrailVertex,
} from "./makiling-trail";

/** 0.009 degrees of latitude is about 1 km. */
const LINE: TrailVertex[] = [
  [121, 14, 100],
  [121, 14.009, 200],
  [121, 14.018, 150],
];

describe("distance", () => {
  test("haversine matches a known degree of latitude", () => {
    expect(haversineMeters([121, 14], [121, 15])).toBeCloseTo(111_195, -2);
  });

  test("cumulative distances grow along the path", () => {
    const cumulative = cumulativeDistances(LINE);
    expect(cumulative[0]).toBe(0);
    expect(cumulative[1]).toBeCloseTo(1000.75, 0);
    expect(cumulative[2]).toBeCloseTo(2001.5, 0);
  });
});

describe("profile sampling and gain", () => {
  test("samples evenly and ends exactly at the last vertex", () => {
    const profile = sampleProfile(LINE, 500);
    expect(profile.map((p) => Math.round(p.distance))).toEqual([
      0, 500, 1000, 1500, 2000, 2002,
    ]);
    expect(profile[0]?.elevation).toBe(100);
    expect(profile[2]?.elevation).toBeCloseTo(200, 0);
    expect(profile.at(-1)?.elevation).toBe(150);
  });

  test("interpolates between vertices", () => {
    const [, half] = sampleProfile(LINE, 500.375);
    expect(half?.elevation).toBeCloseTo(150, 0);
  });

  test("gain counts only rises", () => {
    expect(elevationGain(sampleProfile(LINE, 100))).toBeCloseTo(100, 0);
    expect(
      elevationGain([
        { distance: 0, elevation: 10 },
        { distance: 1, elevation: 30 },
        { distance: 2, elevation: 20 },
        { distance: 3, elevation: 25 },
      ]),
    ).toBe(25);
  });

  test("empty paths and bad steps give no profile", () => {
    expect(sampleProfile([], 50)).toEqual([]);
    expect(sampleProfile(LINE, 0)).toEqual([]);
  });
});

describe("Naismith and difficulty", () => {
  test("1 h per 5 km plus 1 h per 600 m", () => {
    expect(naismithHours(10_000, 600)).toBe(3);
    expect(naismithHours(5000, 0)).toBe(1);
  });

  test("formats to the nearest 10 minutes", () => {
    expect(formatHours(5.216)).toBe("5 h 10 min");
    expect(formatHours(3)).toBe("3 h");
    expect(formatHours(0.4)).toBe("20 min");
  });

  test("Shenandoah bands", () => {
    expect(hikeDifficulty(2000, 20).label).toBe("Easy");
    expect(hikeDifficulty(10_000, 500).label).toBe("Moderately strenuous");
    expect(hikeDifficulty(17_600, 1000).label).toBe("Very strenuous");
  });
});

describe("projection", () => {
  test("a point beside the line lands on it", () => {
    const at = projectOntoPath(LINE, [121.001, 14.0045]);
    expect(at.distance).toBeCloseTo(500, -1);
    expect(at.offset).toBeCloseTo(108, -1);
    expect(at.elevation).toBe(150);
  });
});

describe("Makiling trail data", () => {
  const summary = getTrailSummary();
  const stops = getTrailStops();

  test("starts at the trailhead pin and ends at the Peak 2 pin", () => {
    expect(MAKILING_TRAIL_PATH[0]?.slice(0, 2)).toEqual([121.233701, 14.15132]);
    expect(MAKILING_TRAIL_PATH.at(-1)?.slice(0, 2)).toEqual([
      121.193905, 14.135847,
    ]);
  });

  test("numbers are plausible for the real trail", () => {
    expect(summary.lengthMeters).toBeGreaterThan(8500);
    expect(summary.lengthMeters).toBeLessThan(9100);
    expect(summary.roundTripMeters).toBeCloseTo(summary.lengthMeters * 2, 6);
    // At least the net climb, at most a little over it once DEM noise is smoothed.
    const net = summary.summitElevation - summary.startElevation;
    expect(summary.gainMeters).toBeGreaterThanOrEqual(net);
    expect(summary.gainMeters).toBeLessThan(net * 1.2);
    expect(summary.summitElevation).toBeGreaterThan(1050);
    expect(summary.difficulty).toBe("Very strenuous");
  });

  // The final ascent has rope sections; the old straight-line strip implied
  // a 40% grade from start to finish, which no 50 m sample here comes near
  // except on the summit climb.
  test("no segment is steeper than a roped scramble", () => {
    const profile = summary.profile;
    for (let i = 1; i < profile.length; i++) {
      const prev = profile[i - 1];
      const cur = profile[i];
      if (!prev || !cur || cur.distance - prev.distance < 25) continue;
      const grade =
        Math.abs(cur.elevation - prev.elevation) /
        (cur.distance - prev.distance);
      expect(grade).toBeLessThan(0.75);
    }
  });

  test("every stop sits on the line, in walking order", () => {
    expect(stops).toHaveLength(MAKILING_TRAIL_STOPS.length);
    let previous = -1;
    for (const stop of stops) {
      const at = projectOntoPath(MAKILING_TRAIL_PATH, [stop.lon, stop.lat]);
      expect(at.offset).toBeLessThan(20);
      expect(stop.distanceMeters).toBeGreaterThan(previous);
      previous = stop.distanceMeters;
    }
    expect(stops[0]?.distanceMeters).toBe(0);
    expect(stops.at(-1)?.distanceMeters).toBeCloseTo(summary.lengthMeters, 0);
  });

  test("one trailhead, linked to its directory pin", () => {
    const trailheads = stops.filter(
      (s) => s.placeName === MAKILING_TRAILHEAD_PLACE,
    );
    expect(trailheads).toHaveLength(1);
    expect(trailStopForPlace(MAKILING_TRAILHEAD_PLACE)?.id).toBe("station-1");
    expect(trailStopForPlace(MAKILING_PEAK_2_PLACE)?.id).toBe("peak-2");
    expect(trailStopForPlace("Mud Springs")?.id).toBe("station-8");
    expect(trailStopForPlace("Carabao Park")).toBeNull();
  });

  test("ids are unique and look up", () => {
    expect(new Set(stops.map((s) => s.id)).size).toBe(stops.length);
    expect(findTrailStop("agila-base")?.station).toBe(11);
    expect(findTrailStop("nope")).toBeNull();
    expect(findTrailStop(null)).toBeNull();
  });

  test("station labels and km formatting", () => {
    expect(stationLabel({ station: 11 })).toBe("Station 11");
    expect(stationLabel({ station: null })).toBeNull();
    expect(formatKm(5271)).toBe("5.27 km");
    expect(formatKm(17_598)).toBe("17.6 km");
  });
});

describe("searchTrail", () => {
  const top = (query: string) =>
    [...searchTrail(query)].sort((a, b) => a.score - b.score)[0];

  test("finds the trail by name and common aliases", () => {
    expect(top("Makiling trail")?.stopId).toBeNull();
    expect(top("mt. makiling trail")?.stopId).toBeNull();
    expect(top("trail")?.stopId).toBeNull();
  });

  test("finds stops by name, alias and number", () => {
    expect(top("Agila")?.stopId).toBe("agila-base");
    expect(top("Malaboo")?.stopId).toBe("malaboo");
    expect(top("Peak 2")?.stopId).toBe("peak-2");
    expect(top("summit")?.stopId).toBe("peak-2");
    expect(top("station 13")?.stopId).toBe("station-13");
    expect(top("11")?.stopId).toBe("agila-base");
    expect(top("jump-off")?.stopId).toBe("station-1");
  });

  test("rows carry a pin and a supporting line", () => {
    const agila = top("Agila");
    expect(agila?.secondary).toBe("Makiling Trail, Station 11, 5.27 km");
    expect(agila?.lat).toBeCloseTo(14.129, 3);
  });

  test("misses stay empty", () => {
    expect(searchTrail("")).toEqual([]);
    expect(searchTrail("physci")).toEqual([]);
    // Mid-word hits ("ps" in "campsite") are noise for a two-letter query.
    expect(searchTrail("ps")).toEqual([]);
  });
});
