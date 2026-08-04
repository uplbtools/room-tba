import { afterEach, describe, expect, test } from "bun:test";
import {
  applyMaptilerKeyToText,
  CAMPUS_MAP_STYLE_URL,
  FALLBACK_MAP_STYLE_URL,
  loadCampusMapStyle,
  MAPTILER_KEY_PLACEHOLDER,
} from "@lib/maptiler-key";

/** liberty-customized.json in miniature: our own origin, one keyed source. */
const CAMPUS_STYLE = {
  version: 8,
  name: "campus",
  sources: {
    openmaptiles: {
      type: "vector",
      url: `https://api.maptiler.com/tiles/v3-openmaptiles/tiles.json?key=${MAPTILER_KEY_PLACEHOLDER}`,
    },
  },
  layers: [{ id: "background", type: "background" }],
};

const POSITRON_STYLE = {
  version: 8,
  name: "positron",
  sources: { openmaptiles: { type: "vector", url: "https://example.invalid" } },
  layers: [],
};

type StyleShape = { name?: string; sources?: Record<string, unknown> };

const realFetch = globalThis.fetch;
const realKey = process.env.PUBLIC_MAPTILER_KEY;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Serves the campus style from our origin, the MapTiler TileJSON with the
 * given status, and OpenFreeMap positron. Records every URL requested.
 */
function stubNetwork({ maptilerStatus }: { maptilerStatus: number }) {
  const calls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    if (url === CAMPUS_MAP_STYLE_URL) return json(CAMPUS_STYLE);
    if (url.startsWith("https://api.maptiler.com/")) {
      return maptilerStatus === 200
        ? json({ tiles: ["https://api.maptiler.com/{z}/{x}/{y}.pbf"] })
        : new Response("Forbidden", { status: maptilerStatus });
    }
    if (url === FALLBACK_MAP_STYLE_URL) return json(POSITRON_STYLE);
    throw new Error(`unexpected fetch: ${url}`);
  }) as typeof fetch;
  return calls;
}

afterEach(() => {
  globalThis.fetch = realFetch;
  if (realKey === undefined) delete process.env.PUBLIC_MAPTILER_KEY;
  else process.env.PUBLIC_MAPTILER_KEY = realKey;
});

describe("loadCampusMapStyle — key rejected by MapTiler (#863)", () => {
  test("falls back to OpenFreeMap when the tile source 403s", async () => {
    process.env.PUBLIC_MAPTILER_KEY = "rejected-key-123";
    const calls = stubNetwork({ maptilerStatus: 403 });

    const style = await loadCampusMapStyle<StyleShape>();

    // The style fetch itself succeeded — our own origin always serves it.
    expect(calls).toContain(CAMPUS_MAP_STYLE_URL);
    // ...so the outage is only visible by probing the tile source.
    expect(calls.some((c) => c.startsWith("https://api.maptiler.com/"))).toBe(
      true,
    );
    expect(style.name).toBe("positron");
  });

  test("keeps the custom campus style when the key works", async () => {
    process.env.PUBLIC_MAPTILER_KEY = "working-key-123";
    const calls = stubNetwork({ maptilerStatus: 200 });

    const style = await loadCampusMapStyle<StyleShape>();

    expect(style.name).toBe("campus");
    expect(calls).not.toContain(FALLBACK_MAP_STYLE_URL);
  });

  test("injects the real key into the probed tile URL", async () => {
    process.env.PUBLIC_MAPTILER_KEY = "working-key-123";
    const calls = stubNetwork({ maptilerStatus: 200 });

    await loadCampusMapStyle<StyleShape>();

    const probed = calls.find((c) => c.startsWith("https://api.maptiler.com/"));
    expect(probed).toContain("key=working-key-123");
    expect(probed).not.toContain(MAPTILER_KEY_PLACEHOLDER);
  });

  test("falls back when the tile probe cannot reach MapTiler at all", async () => {
    process.env.PUBLIC_MAPTILER_KEY = "offline-key-123";
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url === CAMPUS_MAP_STYLE_URL) return json(CAMPUS_STYLE);
      if (url === FALLBACK_MAP_STYLE_URL) return json(POSITRON_STYLE);
      throw new TypeError("network error");
    }) as typeof fetch;

    const style = await loadCampusMapStyle<StyleShape>();
    expect(style.name).toBe("positron");
  });

  test("no key configured still yields a usable basemap", async () => {
    delete process.env.PUBLIC_MAPTILER_KEY;
    stubNetwork({ maptilerStatus: 200 });

    const style = await loadCampusMapStyle<StyleShape>();
    expect(style.name).toBe("positron");
  });

  test("raster last resort when OpenFreeMap is unreachable too", async () => {
    delete process.env.PUBLIC_MAPTILER_KEY;
    globalThis.fetch = (async () => {
      throw new TypeError("network error");
    }) as typeof fetch;

    const style = await loadCampusMapStyle<StyleShape>();
    expect(style.sources).toHaveProperty("osm");
  });
});

describe("maptiler-key", () => {
  test("replaces placeholder in tile URLs", () => {
    const url = `https://api.maptiler.com/tiles/v3-openmaptiles/tiles.json?key=${MAPTILER_KEY_PLACEHOLDER}`;
    expect(applyMaptilerKeyToText(url, "test-key")).toBe(
      "https://api.maptiler.com/tiles/v3-openmaptiles/tiles.json?key=test-key",
    );
  });

  test("replaces every placeholder in serialized style JSON", () => {
    const json = JSON.stringify({
      sources: {
        openmaptiles: {
          url: `https://api.maptiler.com/example?key=${MAPTILER_KEY_PLACEHOLDER}`,
        },
      },
    });
    const out = applyMaptilerKeyToText(json, "abc123");
    expect(out).not.toContain(MAPTILER_KEY_PLACEHOLDER);
    expect(out).toContain("abc123");
  });
});
