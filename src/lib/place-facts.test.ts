import { describe, expect, test } from "bun:test";
import {
  buildingFactsLine,
  countClassesNow,
  expandCampusAbbreviations,
  manilaClock,
} from "./place-facts";

// Thursday 2026-10-08, 10:30 in Manila (UTC+8).
const THU_1030 = new Date("2026-10-08T02:30:00Z");

describe("expandCampusAbbreviations", () => {
  test("spells out OPark and Oble", () => {
    expect(
      expandCampusAbbreviations(
        "Located beside Physical Sciences, on the left side of OPark when facing the Oblation.",
      ),
    ).toBe(
      "Located beside Physical Sciences, on the left side of Oblation Park when facing the Oblation.",
    );
    expect(
      expandCampusAbbreviations("The 2-storey building to the left of Oble."),
    ).toBe("The 2-storey building to the left of the Oblation.");
  });

  test("leaves other words and whole names alone", () => {
    expect(expandCampusAbbreviations("Beside OPark Annex, near Obleton")).toBe(
      "Beside Oblation Park Annex, near Obleton",
    );
    expect(expandCampusAbbreviations("Next to the Oble statue")).toBe(
      "Next to the Oblation statue",
    );
  });
});

describe("manilaClock", () => {
  test("reads the Manila weekday and minutes", () => {
    expect(manilaClock(THU_1030)).toEqual({ dayIndex: 3, minutes: 630 });
    // Sunday 00:05 Manila is still Saturday 16:05 UTC.
    expect(manilaClock(new Date("2026-10-10T16:05:00Z"))).toEqual({
      dayIndex: 6,
      minutes: 5,
    });
  });
});

describe("countClassesNow", () => {
  test("counts only sections in session on this day and time", () => {
    const schedules = [
      ["TTh 10:00 AM - 11:30 AM"],
      ["MWF 10:00 AM - 11:00 AM"],
      ["TTh 11:30 AM - 1:00 PM"],
      ["TTH 9:00 AM - 10:31 AM", "F 1:00 PM - 2:00 PM"],
      ["TBA"],
      null,
    ];
    expect(countClassesNow(schedules, THU_1030)).toBe(2);
  });

  test("a class that has just ended is not counted", () => {
    expect(countClassesNow([["TTh 9:00 AM - 10:30 AM"]], THU_1030)).toBe(0);
  });
});

describe("buildingFactsLine", () => {
  test("rooms and classes now", () => {
    expect(
      buildingFactsLine({ roomCount: 42, classesNow: 3, classesThisTerm: 90 }),
    ).toBe("42 rooms, 3 classes now");
  });

  test("singular forms and an empty building hour", () => {
    expect(
      buildingFactsLine({ roomCount: 1, classesNow: 1, classesThisTerm: 4 }),
    ).toBe("1 room, 1 class now");
    expect(
      buildingFactsLine({ roomCount: 5, classesNow: 0, classesThisTerm: 4 }),
    ).toBe("5 rooms, no classes now");
  });

  test("falls back to the term total, then to rooms only", () => {
    expect(
      buildingFactsLine({
        roomCount: 5,
        classesNow: null,
        classesThisTerm: 12,
      }),
    ).toBe("5 rooms, 12 classes this term");
    expect(
      buildingFactsLine({
        roomCount: 5,
        classesNow: null,
        classesThisTerm: null,
      }),
    ).toBe("5 rooms");
    expect(
      buildingFactsLine({
        roomCount: null,
        classesNow: null,
        classesThisTerm: null,
      }),
    ).toBeNull();
  });
});
