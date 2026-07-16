import { describe, expect, test } from "bun:test";
import {
  getActiveSponsors,
  getByTier,
  getGoldSponsor,
  getSilverSponsors,
  rotateSponsor,
  type Sponsor,
} from "./sponsors";

function sponsor(overrides: Partial<Sponsor> = {}): Sponsor {
  return {
    id: "s1",
    name: "Sponsor One",
    tier: "gold",
    url: "https://example.com",
    logo: "/sponsors/s1.png",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    active: true,
    category: "food",
    ...overrides,
  };
}

const NOW = new Date("2026-07-17T12:00:00+08:00");

describe("getActiveSponsors", () => {
  test("keeps only active sponsors inside their date window", () => {
    const list = [
      sponsor({ id: "in-window" }),
      sponsor({ id: "inactive", active: false }),
      sponsor({ id: "expired", endDate: "2026-01-31" }),
      sponsor({ id: "future", startDate: "2026-11-01" }),
    ];
    expect(getActiveSponsors(list, NOW).map((s) => s.id)).toEqual([
      "in-window",
    ]);
  });

  test("includes boundary dates", () => {
    const list = [sponsor({ startDate: "2026-07-17", endDate: "2026-12-31" })];
    expect(getActiveSponsors(list, NOW)).toHaveLength(1);
  });
});

describe("tier selectors", () => {
  const list = [
    sponsor({ id: "g", tier: "gold" }),
    sponsor({ id: "s-a", tier: "silver" }),
    sponsor({ id: "s-b", tier: "silver" }),
    sponsor({ id: "s-off", tier: "silver", active: false }),
  ];

  test("getByTier filters active sponsors by tier", () => {
    expect(getByTier(list, "silver", NOW).map((s) => s.id)).toEqual([
      "s-a",
      "s-b",
    ]);
  });

  test("getGoldSponsor returns first gold or null", () => {
    expect(getGoldSponsor(list, NOW)?.id).toBe("g");
    expect(getGoldSponsor([], NOW)).toBeNull();
  });

  test("getSilverSponsors returns all active silvers", () => {
    expect(getSilverSponsors(list, NOW)).toHaveLength(2);
  });
});

describe("rotateSponsor", () => {
  test("returns null for empty list", () => {
    expect(rotateSponsor([], NOW)).toBeNull();
  });

  test("is deterministic for a given day", () => {
    const list = [sponsor({ id: "a" }), sponsor({ id: "b" })];
    const first = rotateSponsor(list, NOW);
    expect(rotateSponsor(list, NOW)).toBe(first);
  });

  test("rotates across consecutive days", () => {
    const list = [sponsor({ id: "a" }), sponsor({ id: "b" })];
    const day1 = rotateSponsor(list, new Date("2026-07-17T12:00:00+08:00"));
    const day2 = rotateSponsor(list, new Date("2026-07-18T12:00:00+08:00"));
    expect(day1?.id).not.toBe(day2?.id);
  });
});
