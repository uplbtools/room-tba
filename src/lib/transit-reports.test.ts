import { afterEach, describe, expect, test } from "bun:test";
import { resetRateLimitsForTests } from "./api/rate-limit";
import {
  type JeepReport,
  NO_RECENT_REPORTS,
  REPORT_COOLDOWN_MS,
  REPORT_IP_MAX,
  clusterJeeps,
  cooldownDecision,
  enforceReportIpLimit,
  frequencyText,
  isReportTooFar,
  lastReportText,
  median,
  parseStopKey,
  parseStopKeysParam,
  recentFullReports,
  reportMatchesRoute,
  routeReportLine,
  summarizeReports,
  transitStopKey,
  validateReport,
} from "./transit-reports";

const MIN = 60_000;
const NOW = Date.UTC(2026, 9, 8, 2, 0); // 10:00 AM in Los Baños
const ago = (minutes: number) => NOW - minutes * MIN;

const LIBRARY = { name: "Main Library", lat: 14.16523, lon: 121.24138 };
const GATE = { name: "Main Gate", lat: 14.16801, lon: 121.24312 };
const LIBRARY_KEY = transitStopKey(LIBRARY);

describe("stop keys", () => {
  test("round to five decimals and parse back", () => {
    expect(transitStopKey({ lat: 14.165234567, lon: 121.241381 })).toBe(
      "14.16523,121.24138",
    );
    expect(parseStopKey("14.16523,121.24138")).toEqual({
      lat: 14.16523,
      lon: 121.24138,
    });
  });

  test("reject anything that is not a rounded lat,lon", () => {
    for (const bad of [
      "",
      "14.1,121.2",
      "abc",
      "14.16523,121.24138;drop",
      "95.00000,121.00000",
      null,
      42,
    ]) {
      expect(parseStopKey(bad)).toBeNull();
    }
  });

  test("query params must all be valid, distinct keys, capped", () => {
    expect(parseStopKeysParam([LIBRARY_KEY, LIBRARY_KEY])).toEqual([
      LIBRARY_KEY,
    ]);
    expect(parseStopKeysParam([LIBRARY_KEY, "junk"])).toBeNull();
    const many = Array.from(
      { length: 13 },
      (_, i) => `14.${String(10000 + i)},121.24138`,
    );
    expect(parseStopKeysParam(many)).toBeNull();
  });
});

describe("clusterJeeps", () => {
  test("taps within 60 s of a jeep's first tap are the same jeep", () => {
    const first = ago(30);
    expect(
      clusterJeeps([first, first + 20_000, first + 59_000, first + 61_000]),
    ).toEqual([first, first + 61_000]);
  });

  test("anchors to the first tap, so a slow drip still splits", () => {
    const t = ago(10);
    // Each tap is 40 s after the last, but the third is 80 s after the first.
    expect(clusterJeeps([t + 80_000, t, t + 40_000])).toEqual([t, t + 80_000]);
  });
});

describe("median", () => {
  test("odd, even and empty", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe("summarizeReports", () => {
  test("no reports reads as no recent reports, never a number", () => {
    const summary = summarizeReports([], NOW);
    expect(summary).toEqual({ lastAt: null, jeeps: 0, everyMinutes: null });
    expect(lastReportText(summary, NOW)).toBe(NO_RECENT_REPORTS);
    expect(frequencyText(summary)).toBeNull();
  });

  test("reports older than an hour are stale", () => {
    const summary = summarizeReports([ago(61), ago(75)], NOW);
    expect(lastReportText(summary, NOW)).toBe(NO_RECENT_REPORTS);
  });

  test("one report gives a last-seen time but no frequency", () => {
    const summary = summarizeReports([ago(4)], NOW);
    expect(lastReportText(summary, NOW)).toBe("Last jeep reported 4 min ago");
    expect(frequencyText(summary)).toBeNull();
  });

  test("a report under a minute old reads as just now", () => {
    expect(lastReportText(summarizeReports([NOW - 20_000], NOW), NOW)).toBe(
      "Last jeep reported just now",
    );
  });

  test("median gap between distinct jeeps, duplicates clustered", () => {
    // Jeeps at 32, 24, 16, 6 min ago (gaps 8, 8, 10); doubled taps collapse.
    const times = [
      ago(32),
      ago(32) + 15_000,
      ago(24),
      ago(16),
      ago(16) + 30_000,
      ago(6),
    ];
    const summary = summarizeReports(times, NOW);
    expect(summary.jeeps).toBe(4);
    expect(summary.everyMinutes).toBe(8);
    expect(frequencyText(summary)).toBe("About every 8 min lately");
    expect(lastReportText(summary, NOW)).toBe("Last jeep reported 6 min ago");
  });

  test("three jeeps are not enough for a frequency", () => {
    const summary = summarizeReports([ago(20), ago(12), ago(4)], NOW);
    expect(summary.jeeps).toBe(3);
    expect(summary.everyMinutes).toBeNull();
  });

  test("frequency drops once the next jeep is long overdue", () => {
    // Every 5 min until 40 min ago: 40 min of silence breaks the pattern.
    const summary = summarizeReports([ago(55), ago(50), ago(45), ago(40)], NOW);
    expect(summary.everyMinutes).toBeNull();
    expect(lastReportText(summary, NOW)).toBe("Last jeep reported 40 min ago");
  });
});

function report(
  partial: Partial<JeepReport> & { minutesAgo: number },
): JeepReport {
  return {
    routeId: "kaliwa-kanan",
    stopKey: LIBRARY_KEY,
    direction: "forward",
    full: false,
    ...partial,
    at: new Date(ago(partial.minutesAgo)).toISOString(),
  };
}

describe("recentFullReports", () => {
  test("counts full reports from the last 20 minutes only", () => {
    const reports = [
      report({ minutesAgo: 2, full: true }),
      report({ minutesAgo: 10, full: true }),
      report({ minutesAgo: 25, full: true }),
      report({ minutesAgo: 5 }),
    ];
    expect(recentFullReports(reports, NOW)).toBe(2);
  });
});

describe("routeReportLine", () => {
  test("newest report anywhere, frequency from the busiest stop", () => {
    const gateKey = transitStopKey(GATE);
    const reports = [
      report({ minutesAgo: 2, stopKey: gateKey }),
      ...[30, 22, 14, 6].map((m) => report({ minutesAgo: m })),
    ];
    expect(routeReportLine(reports, [LIBRARY, GATE], NOW)).toEqual({
      last: "Last jeep reported 2 min ago at Main Gate",
      frequency: "About every 8 min lately at Main Library",
    });
  });

  test("ignores stops no longer on the route", () => {
    const reports = [report({ minutesAgo: 3, stopKey: "10.00000,120.00000" })];
    expect(routeReportLine(reports, [LIBRARY], NOW)).toEqual({
      last: NO_RECENT_REPORTS,
      frequency: null,
    });
  });
});

describe("validateReport", () => {
  const valid = {
    routeId: "kaliwa-kanan",
    stopKey: LIBRARY_KEY,
    direction: "reverse",
    deviceId: crypto.randomUUID(),
  };

  test("accepts a minimal report, location optional", () => {
    const result = validateReport(valid);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.full).toBe(false);
    expect(result.value.location).toBeNull();
    expect(result.value.direction).toBe("reverse");
  });

  test("keeps a full flag and a complete location", () => {
    const result = validateReport({
      ...valid,
      full: true,
      lat: 14.1,
      lon: 121.2,
    });
    expect(result.ok && result.value.full).toBe(true);
    expect(result.ok && result.value.location).toEqual({
      lat: 14.1,
      lon: 121.2,
    });
  });

  test("drops a half or junk location instead of failing", () => {
    const result = validateReport({ ...valid, lat: 14.1, lon: "x" });
    expect(result.ok && result.value.location).toBeNull();
  });

  test("rejects bad route, stop, direction, device or flag", () => {
    for (const bad of [
      null,
      [],
      "report",
      { ...valid, routeId: "Kaliwa Kanan" },
      { ...valid, routeId: "" },
      { ...valid, stopKey: "main library" },
      { ...valid, direction: "up" },
      { ...valid, deviceId: undefined },
      { ...valid, deviceId: "short" },
      { ...valid, full: "yes" },
    ]) {
      expect(validateReport(bad).ok).toBe(false);
    }
  });
});

describe("isReportTooFar", () => {
  test("only when a location was sent and it is far from the stop", () => {
    expect(isReportTooFar(LIBRARY_KEY, null)).toBe(false);
    expect(isReportTooFar(LIBRARY_KEY, { lat: 14.1655, lon: 121.2415 })).toBe(
      false,
    );
    // Calamba is ~15 km away.
    expect(isReportTooFar(LIBRARY_KEY, { lat: 14.2117, lon: 121.1653 })).toBe(
      true,
    );
  });
});

describe("reportMatchesRoute", () => {
  const route = { stops: [LIBRARY, GATE] };

  test("the stop must be on the route", () => {
    expect(
      reportMatchesRoute(route, false, {
        stopKey: LIBRARY_KEY,
        direction: null,
      }),
    ).toBe(true);
    expect(
      reportMatchesRoute(route, false, {
        stopKey: "14.20000,121.20000",
        direction: null,
      }),
    ).toBe(false);
  });

  test("two-way routes need a direction, one-way routes refuse one", () => {
    expect(
      reportMatchesRoute(route, true, {
        stopKey: LIBRARY_KEY,
        direction: null,
      }),
    ).toBe(false);
    expect(
      reportMatchesRoute(route, false, {
        stopKey: LIBRARY_KEY,
        direction: "forward",
      }),
    ).toBe(false);
    expect(
      reportMatchesRoute(route, true, {
        stopKey: LIBRARY_KEY,
        direction: "forward",
      }),
    ).toBe(true);
  });
});

describe("cooldownDecision", () => {
  test("first report, or one after the cooldown, is stored", () => {
    expect(cooldownDecision(null, false, NOW)).toBe("insert");
    expect(
      cooldownDecision(
        { at: NOW - REPORT_COOLDOWN_MS, full: false },
        false,
        NOW,
      ),
    ).toBe("insert");
  });

  test("a repeat tap inside the cooldown is refused", () => {
    expect(cooldownDecision({ at: ago(1), full: false }, false, NOW)).toBe(
      "reject",
    );
    expect(cooldownDecision({ at: ago(1), full: true }, true, NOW)).toBe(
      "reject",
    );
  });

  test("'It was full' right after 'Jeep is here' marks that report", () => {
    expect(cooldownDecision({ at: ago(1), full: false }, true, NOW)).toBe(
      "mark-full",
    );
  });
});

describe("enforceReportIpLimit", () => {
  afterEach(() => resetRateLimitsForTests());

  test("allows a burst up to the cap, then refuses", () => {
    const ip = "203.0.113.9";
    for (let i = 0; i < REPORT_IP_MAX; i++) {
      expect(enforceReportIpLimit(ip, NOW)).toBeNull();
    }
    expect(enforceReportIpLimit(ip, NOW)).toMatchObject({ allowed: false });
    expect(enforceReportIpLimit("203.0.113.10", NOW)).toBeNull();
  });
});
