import { afterEach, describe, expect, test } from "bun:test";
import { getSyncKey } from "./sync-keys";

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

/** Records every URL the probe hits and answers with one batched payload. */
function stubCheckEndpoint(data: Record<string, string | null> | null) {
  const calls: string[] = [];
  globalThis.fetch = (async (url: string | URL | Request) => {
    calls.push(String(url));
    return new Response(JSON.stringify({ success: true, error: null, data }), {
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  return calls;
}

const BOOT_TABLES = [
  "buildings",
  "colleges",
  "divisions",
  "dorms",
  "events",
  "classes",
  "organizations",
  "places",
];

describe("getSyncKey — batched sync probe (#866)", () => {
  test("the eight boot lookups share a single /api/check request", async () => {
    const calls = stubCheckEndpoint(
      Object.fromEntries(BOOT_TABLES.map((t) => [t, `${t}-key`])),
    );

    const keys = await Promise.all(
      BOOT_TABLES.map((table) => getSyncKey(table)),
    );

    expect(calls).toEqual(["/api/check"]);
    expect(keys).toEqual(BOOT_TABLES.map((t) => `${t}-key`));
  });

  test("a later refresh re-probes instead of reusing a settled response", async () => {
    const calls = stubCheckEndpoint({ buildings: "b1" });

    expect(await getSyncKey("buildings")).toBe("b1");
    expect(await getSyncKey("buildings")).toBe("b1");

    // An admin write changes the key; a cached probe would hide it.
    expect(calls).toEqual(["/api/check", "/api/check"]);
  });

  test("a table missing from the registry reads as null, not undefined", async () => {
    stubCheckEndpoint({ buildings: "b1" });
    expect(await getSyncKey("jeepney_routes")).toBeNull();
  });

  test("a registry response without data reads as null", async () => {
    stubCheckEndpoint(null);
    expect(await getSyncKey("buildings")).toBeNull();
  });
});
