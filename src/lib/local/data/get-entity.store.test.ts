import { afterEach, describe, expect, test } from "vitest";
import { getEntity } from "./utils";

type Row = { id: number };

const realFetch = globalThis.fetch;

function mockFetch(body: unknown) {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(body), { status: 200 })) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("getEntity", () => {
  test("survives a throwing local cache when offline", async () => {
    const load = getEntity<Row>("things", async () => {
      throw new Error("PGlite gone");
    });
    const result = await load({ valid: false, newKey: null });
    expect(result).toEqual({ rows: [], source: "cache" });
  });

  test("returns stale cache when sync endpoint is unreachable", async () => {
    const load = getEntity<Row>("things", async () => [{ id: 1 }]);
    const result = await load({ valid: false, newKey: null });
    expect(result).toEqual({ rows: [{ id: 1 }], source: "cache" });
  });

  test("returns cache when sync key is valid and cache is non-empty", async () => {
    const load = getEntity<Row>("things", async () => [{ id: 2 }]);
    const result = await load({ valid: true, newKey: "k" });
    expect(result).toEqual({ rows: [{ id: 2 }], source: "cache" });
  });

  test("fetches remote when cache is empty despite valid sync key", async () => {
    mockFetch([{ id: 3 }]);
    const load = getEntity<Row>("things", async () => []);
    const result = await load({ valid: true, newKey: "k" });
    expect(result).toEqual({ rows: [{ id: 3 }], source: "remote" });
  });

  test("falls back to cache when remote returns a non-array", async () => {
    mockFetch({ error: "oops" });
    const load = getEntity<Row>("things", async () => [{ id: 4 }]);
    const result = await load({ valid: false, newKey: "k" });
    expect(result).toEqual({ rows: [{ id: 4 }], source: "cache" });
  });
});
