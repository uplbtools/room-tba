import { describe, expect, test } from "bun:test";
import { MAX_IMAGES_PER_LANDMARK, landmarkImages } from "@lib/landmark-images";

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

describe("landmarkImages", () => {
  test("orders contributor, street view angles, commons; caps at 10", () => {
    const images = landmarkImages({
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
    const commons = landmarkImages(FREEDOM_PARK).find(
      (i) => i.source === "commons",
    );
    expect(commons?.credit).toMatch(/\(.+\)/);
    expect(commons?.creditUrl).toContain("commons.wikimedia.org");
  });

  test("no key means no street view, but commons still shows", () => {
    const images = landmarkImages({
      ...FREEDOM_PARK,
      googleKey: undefined,
    });
    expect(images.some((i) => i.source === "street-view")).toBe(false);
    expect(images.some((i) => i.source === "commons")).toBe(true);
  });

  test("unlisted building with a pano falls back to the single aimed shot", () => {
    const images = landmarkImages({
      name: "Not In The Manifest Hall",
      lat: 14.16,
      lon: 121.24,
      panoId: "pano",
      googleKey: "test-google-key",
    });
    expect(images).toHaveLength(1);
    expect(new URL(images[0]!.src).searchParams.get("heading")).toBeNull();
  });

  test("user-contributed pano credits its uploader, not Google", () => {
    const streetView = landmarkImages(FREEDOM_PARK).filter(
      (i) => i.source === "street-view",
    );
    expect(streetView[0]?.credit).toBe(
      "Street View image © Ry Clark Media Arts",
    );
    // Pinned to the pano the headings were computed from.
    expect(new URL(streetView[0]!.src).searchParams.get("pano")).toBe(
      "CAoSFkNJSE0wb2dLRUlDQWdJREUwYVhZT1E.",
    );
  });

  test("dorms, places and orgs read their own kind's manifest key", () => {
    // "dorm:Centtro Residences" and "place:Church Among the Palms" ship in
    // the committed manifest; neither has a DB pano column, so the pinned
    // manifest pano alone has to turn Street View on.
    const dorm = landmarkImages({
      kind: "dorm",
      name: "Centtro Residences",
      lat: 14.1679,
      lon: 121.2433,
      googleKey: "test-google-key",
    });
    expect(dorm.map((i) => i.source)).toEqual([
      "street-view",
      "street-view",
      "street-view",
    ]);
    const url = new URL(dorm[0]!.src);
    expect(url.searchParams.get("pano")).toBe("kQ9CVamNbadixlLz8p6UcQ");
    expect(url.searchParams.get("location")).toBeNull();
    expect(dorm[0]?.credit).toBe("Street View image © Google");

    const place = landmarkImages({
      kind: "place",
      name: "Church Among the Palms",
      googleKey: "test-google-key",
    });
    expect(place.some((i) => i.source === "commons")).toBe(true);

    // Same name under another kind is a different entry.
    expect(
      landmarkImages({ kind: "organization", name: "Centtro Residences" }),
    ).toEqual([]);
  });

  test("contributor photo still leads for non-building kinds", () => {
    const images = landmarkImages({
      kind: "place",
      name: "Church Among the Palms",
      imageUrl: "https://r2.example/church.jpg",
    });
    expect(images[0]?.source).toBe("contributor");
  });

  test("nothing anywhere yields an empty gallery", () => {
    expect(landmarkImages({ name: "Ghost", panoId: null })).toEqual([]);
  });
});
