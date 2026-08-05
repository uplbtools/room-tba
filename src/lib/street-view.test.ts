import { describe, expect, test } from "bun:test";
import {
  fetchStreetViewMetadata,
  hasStreetViewKey,
  streetViewImageUrl,
  streetViewMetadataUrl,
} from "./street-view.ts";

const KEY = "test-street-view-key-not-a-real-credential";
// Institute of Computer Science, roughly.
const ICS = { lat: 14.1651, lng: 121.2413 };

describe("hasStreetViewKey", () => {
  test("treats absent or stub keys as no key, so the feature stays off", () => {
    expect(hasStreetViewKey(undefined)).toBe(false);
    expect(hasStreetViewKey("")).toBe(false);
    expect(hasStreetViewKey("   ")).toBe(false);
    expect(hasStreetViewKey("short")).toBe(false);
  });

  test("accepts a real-looking key", () => {
    expect(hasStreetViewKey(KEY)).toBe(true);
  });
});

describe("streetViewImageUrl", () => {
  test("builds a request with location and key", () => {
    const url = new URL(streetViewImageUrl(ICS, KEY));
    expect(url.origin + url.pathname).toBe(
      "https://maps.googleapis.com/maps/api/streetview",
    );
    expect(url.searchParams.get("location")).toBe("14.1651,121.2413");
    expect(url.searchParams.get("key")).toBe(KEY);
    expect(url.searchParams.get("size")).toBe("640x400");
  });

  test("clamps size to the 640px ceiling instead of erroring at Google", () => {
    const url = new URL(
      streetViewImageUrl(ICS, KEY, { width: 4000, height: 2000 }),
    );
    expect(url.searchParams.get("size")).toBe("640x640");
  });

  test("clamps pitch and fov to their documented ranges", () => {
    const url = new URL(
      streetViewImageUrl(ICS, KEY, { pitch: 200, fov: 5, heading: 90 }),
    );
    expect(url.searchParams.get("pitch")).toBe("90");
    expect(url.searchParams.get("fov")).toBe("10");
    expect(url.searchParams.get("heading")).toBe("90");
  });

  test("omits optional params when not given, letting Google choose", () => {
    const url = new URL(streetViewImageUrl(ICS, KEY));
    expect(url.searchParams.has("heading")).toBe(false);
    expect(url.searchParams.has("pitch")).toBe(false);
    expect(url.searchParams.has("radius")).toBe(false);
  });

  test("passes radius through, which is what finds set-back buildings", () => {
    const url = new URL(streetViewImageUrl(ICS, KEY, { radius: 100 }));
    expect(url.searchParams.get("radius")).toBe("100");
  });
});

describe("streetViewMetadataUrl", () => {
  test("points at the free metadata endpoint, not the billable image one", () => {
    const url = new URL(streetViewMetadataUrl(ICS, KEY));
    expect(url.pathname).toBe("/maps/api/streetview/metadata");
    expect(url.searchParams.has("size")).toBe(false);
  });
});

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe("fetchStreetViewMetadata", () => {
  test("reports coverage with the pano id and capture date", async () => {
    const result = await fetchStreetViewMetadata(ICS, KEY, {
      fetchImpl: async () =>
        jsonResponse({
          status: "OK",
          pano_id: "pano-123",
          location: { lat: 14.1652, lng: 121.2414 },
          date: "2023-04",
        }),
    });
    expect(result).toEqual({
      status: "OK",
      panoId: "pano-123",
      location: { lat: 14.1652, lng: 121.2414 },
      date: "2023-04",
    });
  });

  test("reports no coverage, which is what gates a billable image request", async () => {
    const result = await fetchStreetViewMetadata(ICS, KEY, {
      fetchImpl: async () => jsonResponse({ status: "ZERO_RESULTS" }),
    });
    expect(result.status).toBe("ZERO_RESULTS");
  });

  test("never throws on a transport failure, so a panel cannot break", async () => {
    const result = await fetchStreetViewMetadata(ICS, KEY, {
      fetchImpl: async () => {
        throw new Error("network down");
      },
    });
    expect(result).toEqual({ status: "ERROR", reason: "network down" });
  });

  test("surfaces a rejected key rather than pretending there is no imagery", async () => {
    const result = await fetchStreetViewMetadata(ICS, KEY, {
      fetchImpl: async () =>
        jsonResponse({
          status: "REQUEST_DENIED",
          error_message: "This API project is not authorized",
        }),
    });
    expect(result).toEqual({
      status: "ERROR",
      reason: "This API project is not authorized",
    });
  });

  test("treats a non-2xx as an error, not as absent imagery", async () => {
    const result = await fetchStreetViewMetadata(ICS, KEY, {
      fetchImpl: async () => jsonResponse({}, false, 403),
    });
    expect(result).toEqual({ status: "ERROR", reason: "HTTP 403" });
  });
});
