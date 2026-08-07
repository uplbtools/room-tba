import { describe, expect, test } from "bun:test";
import {
  MAX_IMAGES_PER_LANDMARK,
  buildingLandmarkImages,
} from "@lib/landmark-images";

// "building:Freedom Park" ships in the committed manifest with three
// Street View headings and at least one Commons photo, so the real manifest
// doubles as the fixture.
const FREEDOM_PARK = {
  name: "Freedom Park",
  lat: 14.1617660159005,
  lon: 121.241457649492,
  panoId: "CAoSFkNJSE0wb2dLRUlDQWdJREUwYVhZT1E.",
  googleKey: "test-google-key",
};

describe("buildingLandmarkImages", () => {
  test("orders contributor, street view angles, commons; caps at 10", () => {
    const images = buildingLandmarkImages({
      ...FREEDOM_PARK,
      imageUrl: "https://r2.example/freedom-park.jpg",
    });
    expect(images[0]?.source).toBe("contributor");
    const streetView = images.filter((i) => i.source === "street-view");
    expect(streetView).toHaveLength(3);
    // Manifest headings, not the single default shot.
    expect(
      streetView.map((i) => new URL(i.src).searchParams.get("heading")),
    ).toEqual(["233", "288", "343"]);
    expect(
      images.filter((i) => i.source === "commons").length,
    ).toBeGreaterThanOrEqual(1);
    expect(images.length).toBeLessThanOrEqual(MAX_IMAGES_PER_LANDMARK);
  });

  test("commons credit carries artist, license, and the file page link", () => {
    const commons = buildingLandmarkImages(FREEDOM_PARK).find(
      (i) => i.source === "commons",
    );
    expect(commons?.credit).toMatch(/\(.+\)/);
    expect(commons?.creditUrl).toContain("commons.wikimedia.org");
  });

  test("no key means no street view, but commons still shows", () => {
    const images = buildingLandmarkImages({
      ...FREEDOM_PARK,
      googleKey: undefined,
    });
    expect(images.some((i) => i.source === "street-view")).toBe(false);
    expect(images.some((i) => i.source === "commons")).toBe(true);
  });

  test("unlisted building with a pano falls back to the single aimed shot", () => {
    const images = buildingLandmarkImages({
      name: "Not In The Manifest Hall",
      lat: 14.16,
      lon: 121.24,
      panoId: "pano",
      googleKey: "test-google-key",
    });
    expect(images).toHaveLength(1);
    expect(new URL(images[0]!.src).searchParams.get("heading")).toBeNull();
  });

  test("nothing anywhere yields an empty gallery", () => {
    expect(buildingLandmarkImages({ name: "Ghost", panoId: null })).toEqual([]);
  });
});
