import { afterEach, describe, expect, mock, test } from "bun:test";
import { publishEntityPatch } from "./client";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  mock.restore();
});

describe("publishEntityPatch", () => {
  test("returns conflict payload on 409", async () => {
    globalThis.fetch = mock(async () =>
      Response.json(
        {
          error: "This building was changed by another editor.",
          latest: { id: 1, version: 5, lat: 1, lon: 2 },
        },
        { status: 409 },
      ),
    ) as typeof fetch;

    const result = await publishEntityPatch("building", 1, 3, {
      lat: 1.1,
      lon: 2.2,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("changed by another editor");
    expect(result.latest).toEqual({
      id: 1,
      version: 5,
      lat: 1,
      lon: 2,
    });
  });

  test("returns published entity on success", async () => {
    globalThis.fetch = mock(async () =>
      Response.json({
        success: true,
        building: { id: 1, version: 4, lat: 1.1, lon: 2.2 },
      }),
    ) as typeof fetch;

    const result = await publishEntityPatch("building", 1, 3, {
      lat: 1.1,
      lon: 2.2,
    });

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({
      id: 1,
      version: 4,
      lat: 1.1,
      lon: 2.2,
    });
  });
});
