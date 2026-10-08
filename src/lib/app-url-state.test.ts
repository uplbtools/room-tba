import { describe, expect, test } from "bun:test";
import {
  carryLayersParam,
  formatDirectionsParam,
  formatLayersParam,
  formatMapHash,
  isUnknownAppPath,
  parseBrowseParam,
  parseDirectionsParam,
  parseLayersParam,
  parseMapHash,
  parseTrailParam,
  readAppState,
  stripOverlayParams,
  withAppState,
  withHash,
} from "./app-url-state";

describe("directions param", () => {
  test("round-trips me, slugs and coordinates", () => {
    const param = formatDirectionsParam({
      from: { kind: "me" },
      to: { kind: "slug", slug: "physical-sciences-building" },
    });
    expect(param).toBe("me/physical-sciences-building");
    expect(parseDirectionsParam(param)).toEqual({
      from: { kind: "me" },
      to: { kind: "slug", slug: "physical-sciences-building" },
    });

    const coords = formatDirectionsParam({
      from: { kind: "coords", lat: 14.16523456789, lng: 121.2415123456 },
      to: { kind: "slug", slug: "main-library" },
    });
    expect(coords).toBe("14.165235,121.241512/main-library");
    expect(parseDirectionsParam(coords)?.from).toEqual({
      kind: "coords",
      lat: 14.165235,
      lng: 121.241512,
    });
  });

  test("rejects malformed or meaningless values", () => {
    expect(parseDirectionsParam(null)).toBeNull();
    expect(parseDirectionsParam("")).toBeNull();
    expect(parseDirectionsParam("me")).toBeNull();
    expect(parseDirectionsParam("a/b/c/d/e/f")).toBeNull();
    expect(parseDirectionsParam("a/me/c")).toBeNull();
    expect(parseDirectionsParam("psb/me")).toBeNull();
    expect(parseDirectionsParam("Not A Slug/psb")).toBeNull();
    expect(parseDirectionsParam("95,10/psb")).toBeNull();
  });
});

describe("directions stops and mode", () => {
  test("round-trips stops between start and end", () => {
    const param = {
      from: { kind: "me" as const },
      via: [
        { kind: "slug" as const, slug: "dl-umali-hall" },
        { kind: "coords" as const, lat: 14.16, lng: 121.24 },
      ],
      to: { kind: "slug" as const, slug: "psb" },
    };
    const text = formatDirectionsParam(param);
    expect(text).toBe("me/dl-umali-hall/14.16,121.24/psb");
    expect(parseDirectionsParam(text)).toEqual(param);
  });

  test("reads the mode tab and drops it with the other overlay params", () => {
    expect(readAppState("?dir=me/psb&mode=transit").mode).toBe("transit");
    expect(readAppState("?dir=me/psb&mode=car").mode).toBeNull();
    expect(stripOverlayParams("?term=3&dir=me/psb&mode=walk")).toBe("?term=3");
  });
});

describe("map hash", () => {
  test("round-trips zoom/lat/lng", () => {
    const hash = formatMapHash({
      zoom: 17.256,
      lat: 14.165234,
      lng: 121.24151,
    });
    expect(hash).toBe("#map=17.26/14.16523/121.24151");
    expect(parseMapHash(hash)).toEqual({
      zoom: 17.26,
      lat: 14.16523,
      lng: 121.24151,
    });
  });

  test("ignores other hashes and out-of-range values", () => {
    expect(parseMapHash("")).toBeNull();
    expect(parseMapHash("#section")).toBeNull();
    expect(parseMapHash("#map=30/14/121")).toBeNull();
    expect(parseMapHash("#map=17/95/121")).toBeNull();
  });
});

describe("withAppState", () => {
  test("sets params, keeps ?term= and the hash, leaves / and , readable", () => {
    expect(
      withAppState("/?term=12#map=17.00/14.1/121.2", {
        dir: "me/14.1,121.2",
      }),
    ).toBe("/?term=12&dir=me/14.1,121.2#map=17.00/14.1/121.2");
  });

  test("removes params given null or empty", () => {
    expect(withAppState("/?q=psb&term=3", { q: null })).toBe("/?term=3");
    expect(withAppState("/?q=psb", { q: "" })).toBe("/");
    expect(withAppState("/building/psb/", { browse: null })).toBe(
      "/building/psb/",
    );
  });

  test("only touches the keys it is given", () => {
    expect(withAppState("/?q=a&dir=me/x", { q: "b" })).toBe("/?q=b&dir=me/x");
  });
});

test("withHash replaces or drops the hash", () => {
  expect(withHash("/?q=a#old", "#new")).toBe("/?q=a#new");
  expect(withHash("/?q=a#old", null)).toBe("/?q=a");
});

test("readAppState decodes what the app writes", () => {
  expect(readAppState("?q=%20chem%20&browse=dorms&dir=me/psb")).toEqual({
    q: "chem",
    browse: "dorms",
    dir: { from: { kind: "me" }, to: { kind: "slug", slug: "psb" } },
    mode: null,
    layers: [],
    trail: null,
  });
  expect(readAppState("?browse=nope")).toEqual({
    q: null,
    browse: null,
    dir: null,
    mode: null,
    layers: [],
    trail: null,
  });
});

test("parseBrowseParam accepts chip and menu lists only", () => {
  expect(parseBrowseParam("events")).toBe("events");
  expect(parseBrowseParam("classes")).toBe("classes");
  expect(parseBrowseParam("jeepney")).toBe("jeepney");
  expect(parseBrowseParam("rooms")).toBeNull();
  expect(parseBrowseParam(null)).toBeNull();
});

test("stripOverlayParams drops ?q= and ?dir= but keeps page params", () => {
  expect(stripOverlayParams("?term=3&q=x&dir=me/psb")).toBe("?term=3");
  expect(stripOverlayParams("?browse=dorms&q=x")).toBe("?browse=dorms");
  expect(stripOverlayParams("")).toBe("");
});

describe("isUnknownAppPath", () => {
  test("flags paths nothing answers", () => {
    expect(isUnknownAppPath("/this-does-not-exist")).toBe(true);
    expect(isUnknownAppPath("/foo/bar/")).toBe(true);
  });

  test("leaves home, app screens, entity and server paths alone", () => {
    expect(isUnknownAppPath("/")).toBe(false);
    expect(isUnknownAppPath("/planner")).toBe(false);
    expect(isUnknownAppPath("/transit/forestry/")).toBe(false);
    // Entity slugs are checked against data, not here.
    expect(isUnknownAppPath("/building/nonexistent/")).toBe(false);
    expect(isUnknownAppPath("/building/")).toBe(false);
    expect(isUnknownAppPath("/faq")).toBe(false);
  });
});

describe("trail params", () => {
  test("?layers= keeps known layers only", () => {
    expect(parseLayersParam("trail")).toEqual(["trail"]);
    expect(parseLayersParam("trail,bogus")).toEqual(["trail"]);
    expect(parseLayersParam(null)).toEqual([]);
    expect(formatLayersParam(["trail", "trail"])).toBe("trail");
    expect(formatLayersParam([])).toBeNull();
  });

  test("?trail= takes a slug", () => {
    expect(parseTrailParam("agila-base")).toBe("agila-base");
    expect(parseTrailParam("overview")).toBe("overview");
    expect(parseTrailParam("<script>")).toBeNull();
    expect(parseTrailParam(null)).toBeNull();
  });

  test("readAppState reads both", () => {
    const state = readAppState("?layers=trail&trail=station-13");
    expect(state.layers).toEqual(["trail"]);
    expect(state.trail).toBe("station-13");
  });

  test("withAppState writes and clears them", () => {
    expect(withAppState("/#map=1/2/3", { layers: "trail" })).toBe(
      "/?layers=trail#map=1/2/3",
    );
    expect(withAppState("/?layers=trail&trail=overview", { trail: null })).toBe(
      "/?layers=trail",
    );
  });

  test("layers and the trail sheet ride on top of any page", () => {
    expect(stripOverlayParams("?layers=trail&trail=overview&term=5")).toBe(
      "?term=5",
    );
  });

  test("carryLayersParam follows the rider between pages", () => {
    expect(carryLayersParam("/building/ics/", "/?layers=trail#map=1/2/3")).toBe(
      "/building/ics/?layers=trail",
    );
    expect(
      carryLayersParam("/building/ics/?layers=trail", "/?layers=trail"),
    ).toBe("/building/ics/?layers=trail");
    expect(carryLayersParam("/building/ics/", "/?q=x")).toBe("/building/ics/");
  });
});
