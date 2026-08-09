import { describe, expect, test } from "bun:test";
import {
  bearingDegrees,
  facadeHeadings,
  isLikelyPhotoTitle,
  stripHtml,
} from "./landmark-images-core";

describe("bearingDegrees", () => {
  test("cardinal directions", () => {
    const origin = { lat: 14.16, lng: 121.24 };
    expect(bearingDegrees(origin, { lat: 14.17, lng: 121.24 })).toBe(0);
    expect(bearingDegrees(origin, { lat: 14.16, lng: 121.25 })).toBe(90);
    expect(bearingDegrees(origin, { lat: 14.15, lng: 121.24 })).toBe(180);
    expect(bearingDegrees(origin, { lat: 14.16, lng: 121.23 })).toBe(270);
  });
});

describe("facadeHeadings", () => {
  test("spreads around the base heading", () => {
    expect(facadeHeadings(90)).toEqual([35, 90, 145]);
  });

  test("wraps across north", () => {
    expect(facadeHeadings(10)).toEqual([315, 10, 65]);
  });
});

describe("isLikelyPhotoTitle", () => {
  test("keeps photographs, drops maps and documents", () => {
    expect(isLikelyPhotoTitle("File:Baker Hall front.jpg")).toBe(true);
    expect(isLikelyPhotoTitle("File:Oblation.JPEG")).toBe(true);
    expect(isLikelyPhotoTitle("File:UPLB campus map.svg")).toBe(false);
    expect(isLikelyPhotoTitle("File:Campus plan.pdf")).toBe(false);
  });
});

describe("stripHtml", () => {
  test("unwraps Commons artist markup", () => {
    expect(
      stripHtml('<a href="//commons.wikimedia.org/wiki/User:X">Juan\nD</a>'),
    ).toBe("Juan D");
  });

  test("drops angle brackets the tag pattern cannot pair off", () => {
    expect(stripHtml("Juan <b")).toBe("Juan b");
    expect(stripHtml('<a href="<script>">Juan</a>')).toBe('"Juan');
    expect(stripHtml("<<a>script>alert(1)")).toBe("scriptalert(1)");
  });
});
