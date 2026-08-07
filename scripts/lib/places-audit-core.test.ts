import { describe, expect, test } from "bun:test";
import {
  DEFAULT_FLAG_THRESHOLD_M,
  classify,
  namesPlausiblyMatch,
  placesQueryText,
} from "./places-audit-core";

describe("placesQueryText", () => {
  test("pins generic names to the campus", () => {
    expect(placesQueryText("Main Library")).toBe(
      "Main Library, University of the Philippines Los Baños",
    );
  });
});

describe("namesPlausiblyMatch", () => {
  test("shared distinctive token matches", () => {
    expect(
      namesPlausiblyMatch(
        "Physical Sciences Building",
        "UPLB Physical Sciences Bldg",
      ),
    ).toBe(true);
  });

  test("structural tokens alone do not match", () => {
    expect(
      namesPlausiblyMatch(
        "Graduate School Building",
        "Administration Building",
      ),
    ).toBe(false);
  });

  test("acronym vs spelled-out is a miss by design", () => {
    expect(
      namesPlausiblyMatch(
        "CEM Building",
        "College of Economics and Management",
      ),
    ).toBe(false);
  });
});

describe("classify", () => {
  const hit = { name: "Graduate School Building", lat: 14.16, lon: 121.24 };

  test("far confident match is flagged", () => {
    expect(
      classify(hit, "Graduate School Building", 190, DEFAULT_FLAG_THRESHOLD_M),
    ).toBe("flagged");
  });

  test("near confident match is aligned", () => {
    expect(
      classify(hit, "Graduate School Building", 12, DEFAULT_FLAG_THRESHOLD_M),
    ).toBe("aligned");
  });

  test("exactly at the threshold flags", () => {
    expect(
      classify(hit, "Graduate School Building", 50, DEFAULT_FLAG_THRESHOLD_M),
    ).toBe("flagged");
  });

  test("wrongly named result never flags, whatever the distance", () => {
    expect(
      classify(
        { ...hit, name: "Los Baños Municipal Hall" },
        "Graduate School Building",
        500,
        DEFAULT_FLAG_THRESHOLD_M,
      ),
    ).toBe("unmatched");
  });

  test("no result is unmatched", () => {
    expect(
      classify(
        null,
        "Graduate School Building",
        null,
        DEFAULT_FLAG_THRESHOLD_M,
      ),
    ).toBe("unmatched");
  });
});
