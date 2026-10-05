import { afterEach, describe, expect, mock, test } from "bun:test";
import {
  OVERPASS_ENDPOINTS,
  OVERPASS_TIMEOUT_MS,
  fetchOverpass,
  selectFootprint,
  type OverpassElement,
} from "./overpass";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("fetchOverpass", () => {
  test("POSTs the query form-encoded as data= with a timeout signal", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    globalThis.fetch = mock(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ elements: [] }));
    }) as unknown as typeof fetch;

    const query = '[out:json];way["building"](around:35,14.1,121.2);out;';
    expect(await fetchOverpass(query)).toEqual({ elements: [] });

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(OVERPASS_ENDPOINTS[0]!);
    const { body, signal, method } = calls[0]!.init;
    expect(method).toBe("POST");
    expect(body).toBeInstanceOf(URLSearchParams);
    expect((body as URLSearchParams).get("data")).toBe(query);
    expect(String(body)).toStartWith("data=%5Bout%3Ajson%5D");
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  test("falls through to the next endpoint on HTTP error or timeout", async () => {
    const urls: string[] = [];
    globalThis.fetch = mock(async (url: string, init: RequestInit) => {
      urls.push(url);
      if (urls.length === 1) return new Response("", { status: 406 });
      // Second endpoint hangs until its signal aborts.
      return new Promise<Response>((_, reject) => {
        init.signal?.addEventListener("abort", () =>
          reject(init.signal?.reason),
        );
      });
    }) as unknown as typeof fetch;

    const started = Date.now();
    expect(await fetchOverpass("q", { timeoutMs: 50 })).toBeNull();
    expect(Date.now() - started).toBeLessThan(OVERPASS_TIMEOUT_MS);
    expect(urls).toEqual([...OVERPASS_ENDPOINTS]);
  });
});

test("treats a 200 with a runtime-error remark as a failure, not 'no building'", async () => {
  let n = 0;
  globalThis.fetch = mock(async () => {
    n += 1;
    return new Response(
      JSON.stringify(
        n === 1
          ? { elements: [], remark: "runtime error: Query timed out" }
          : { elements: [{ type: "node", id: 1, lat: 0, lon: 0 }] },
      ),
    );
  }) as unknown as typeof fetch;
  const data = (await fetchOverpass("q")) as { elements: unknown[] };
  expect(n).toBe(2);
  expect(data.elements).toHaveLength(1);
});

describe("selectFootprint", () => {
  // Two squares; the point (0.5, 0.5) sits inside way 1 only.
  const square = (id: number, x: number, nodeBase: number) => [
    { type: "node", id: nodeBase, lat: 0, lon: x },
    { type: "node", id: nodeBase + 1, lat: 0, lon: x + 1 },
    { type: "node", id: nodeBase + 2, lat: 1, lon: x + 1 },
    { type: "node", id: nodeBase + 3, lat: 1, lon: x },
    {
      type: "way",
      id,
      nodes: [nodeBase, nodeBase + 1, nodeBase + 2, nodeBase + 3, nodeBase],
      tags: { building: "yes", name: `B${id}`, "building:levels": "3" },
    },
  ];
  const elements = [
    ...square(1, 0, 10),
    ...square(2, 5, 20),
  ] as OverpassElement[];

  test("prefers the way containing the point", () => {
    const fp = selectFootprint({ elements }, 0.5, 0.5);
    expect(fp?.osmName).toBe("B1");
    expect(fp?.containsPoint).toBe(true);
    expect(fp?.levels).toBe(3);
  });

  test("falls back to the nearest centroid and says so", () => {
    const fp = selectFootprint({ elements }, 0.5, 4);
    expect(fp?.osmName).toBe("B2");
    expect(fp?.containsPoint).toBe(false);
  });

  test("returns null with no buildings", () => {
    expect(selectFootprint({ elements: [] }, 0, 0)).toBeNull();
    expect(selectFootprint(null, 0, 0)).toBeNull();
  });
});
