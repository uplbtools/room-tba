import { describe, expect, test } from "bun:test";
import {
  MAX_IMAGES_PER_LANDMARK,
  landmarkImages,
  needsStreetViewLookup,
} from "@lib/landmark-images";

// "building:CEM Building" ships in the committed manifest with three Street
// View headings from a Google capture, so the real manifest doubles as the
// fixture.
const CEM = {
  name: "CEM Building",
  lat: 14.1675,
  lon: 121.2412,
  panoId: null,
  googleKey: "test-google-key",
};

// The only pano near "building:Freedom Park" is a photo sphere somebody
// uploaded ("© Ry Clark Media Arts").
const FREEDOM_PARK = {
  name: "Freedom Park",
  lat: 14.1617660159005,
  lon: 121.241457649492,
  panoId: "CAoSFkNJSE0wb2dLRUlDQWdJREUwYVhZT1E.",
  googleKey: "test-google-key",
};

// Commons photos must name their place in the file title, so Freedom Park has
// none; the Veterinary Teaching Hospital carries two titled photos.
const VET_HOSPITAL = {
  name: "Veterinary Teaching Hospital",
  lat: 14.16,
  lon: 121.24,
  panoId: null,
  googleKey: "test-google-key",
};

describe("landmarkImages", () => {
  test("orders street view angles, contributor, commons; caps at 10", () => {
    const images = landmarkImages({
      ...CEM,
      imageUrl: "https://r2.example/cem.jpg",
    });
    expect(images.slice(0, 4).map((i) => i.source)).toEqual([
      "street-view",
      "street-view",
      "street-view",
      "contributor",
    ]);
    const streetView = images.filter((i) => i.source === "street-view");
    // Manifest headings, not the single default shot.
    expect(
      streetView.map((i) => new URL(i.src).searchParams.get("heading")),
    ).toEqual(["159", "214", "269"]);
    expect(new URL(streetView[0]!.src).searchParams.get("pano")).toBe(
      "wV4r1MZug8UnL2mEU0OtWA",
    );
    expect(streetView[0]?.credit).toBe("Street View image © Google");
    expect(images.length).toBeLessThanOrEqual(MAX_IMAGES_PER_LANDMARK);
  });

  test("commons credit carries artist, license, and the file page link", () => {
    const commons = landmarkImages(VET_HOSPITAL).find(
      (i) => i.source === "commons",
    );
    expect(commons?.credit).toMatch(/\(.+\)/);
    expect(commons?.creditUrl).toContain("commons.wikimedia.org");
  });

  test("no key means no street view, but commons still shows", () => {
    const images = landmarkImages({
      ...VET_HOSPITAL,
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

  test("a pano somebody uploaded comes last, credited to its uploader", () => {
    const images = landmarkImages({
      ...FREEDOM_PARK,
      imageUrl: "https://r2.example/freedom-park.jpg",
    });
    expect(images[0]?.source).toBe("contributor");
    const streetView = images.filter((i) => i.source === "street-view");
    expect(streetView).toHaveLength(3);
    expect(images.slice(-3)).toEqual(streetView);
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

// A food spot no manifest run has seen: Street View comes from the runtime
// metadata lookup instead.
const FOOD_TRUCK = {
  kind: "place" as const,
  name: "Test Food Truck",
  lat: 14.165,
  lon: 121.242,
  googleKey: "test-google-key",
};

describe("runtime Street View lookup", () => {
  test("only unlisted entities with a key and coordinates need one", () => {
    expect(needsStreetViewLookup(FOOD_TRUCK)).toBe(true);
    expect(needsStreetViewLookup({ ...FOOD_TRUCK, googleKey: undefined })).toBe(
      false,
    );
    expect(needsStreetViewLookup({ ...FOOD_TRUCK, lat: null })).toBe(false);
    // A cached "no coverage" skips the request.
    expect(needsStreetViewLookup({ ...FOOD_TRUCK, panoId: null })).toBe(false);
    expect(
      needsStreetViewLookup({ ...FOOD_TRUCK, name: "Church Among the Palms" }),
    ).toBe(false);
  });

  test("looked-up pano leads, pinned and aimed at the place", () => {
    const images = landmarkImages({
      ...FOOD_TRUCK,
      imageUrl: "https://r2.example/truck.jpg",
      lookedUpPano: {
        panoId: "lookup-pano",
        heading: 87,
        copyright: "© Google",
      },
    });
    expect(images.map((i) => i.source)).toEqual(["street-view", "contributor"]);
    const url = new URL(images[0]!.src);
    expect(url.searchParams.get("pano")).toBe("lookup-pano");
    expect(url.searchParams.get("heading")).toBe("87");
    expect(images[0]?.credit).toBe("Street View image © Google");
  });

  test("an uploaded photo sphere goes last with its uploader credit", () => {
    const images = landmarkImages({
      ...FOOD_TRUCK,
      imageUrl: "https://r2.example/truck.jpg",
      lookedUpPano: { panoId: "sphere", copyright: "© Juan Dela Cruz" },
    });
    expect(images.map((i) => i.source)).toEqual(["contributor", "street-view"]);
    expect(images[1]?.credit).toBe("Street View image © Juan Dela Cruz");
    expect(new URL(images[1]!.src).searchParams.get("heading")).toBeNull();
  });

  test("no lookup result, no Street View; a manifest entry wins", () => {
    expect(landmarkImages({ ...FOOD_TRUCK, lookedUpPano: null })).toEqual([]);
    const church = landmarkImages({
      ...FOOD_TRUCK,
      name: "Church Among the Palms",
      lookedUpPano: { panoId: "lookup-pano", heading: 10 },
    });
    expect(church.some((i) => i.src.includes("lookup-pano"))).toBe(false);
  });
});
