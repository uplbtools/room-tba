import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClassQueryPage } from "@lib/classes-api";

// fetchClassPage only needs getJSONFetch (which is `fetch(url).json()`). The real
// util transitively boots the whole Svelte-rune store graph, so mock the boundary
// and assert the /api/classes URL fetchClassPage builds from its options.
// (.store.test.ts so it runs under vitest, where vi.mock is hoisted + file-scoped
// — a bun mock.module here would leak into every other test in the run.)
const { getJSONFetch } = vi.hoisted(() => ({ getJSONFetch: vi.fn() }));
vi.mock("@lib/local/data/utils", () => ({ getJSONFetch }));

import { fetchClassPage } from "@lib/classes-api";

const calledUrl = () => new URL(getJSONFetch.mock.calls[0][0], "http://x");

describe("fetchClassPage", () => {
  beforeEach(() => {
    getJSONFetch.mockReset();
    getJSONFetch.mockResolvedValue({ rows: [], total: 0 });
  });

  it("hits /api/classes and encodes every provided option", async () => {
    const result: ClassQueryPage = {
      rows: [{ courseCode: "CMSC 128" }],
      total: 1,
    };
    getJSONFetch.mockResolvedValueOnce(result);

    const page = await fetchClassPage({
      termId: 1252,
      courseCodePrefix: "CMSC",
      limit: 10,
      offset: 20,
    });

    const url = calledUrl();
    expect(url.pathname).toBe("/api/classes");
    expect(url.searchParams.get("term_id")).toBe("1252");
    expect(url.searchParams.get("course_code")).toBe("CMSC");
    expect(url.searchParams.get("limit")).toBe("10");
    expect(url.searchParams.get("offset")).toBe("20");
    expect(page).toEqual(result);
  });

  it("defaults limit to 25 and offset to 0", async () => {
    await fetchClassPage({ termId: 1252 });
    const p = calledUrl().searchParams;
    expect(p.get("limit")).toBe("25");
    expect(p.get("offset")).toBe("0");
  });

  it("omits term_id when null and a blank course code", async () => {
    await fetchClassPage({ termId: null, courseCodePrefix: "   " });
    const p = calledUrl().searchParams;
    expect(p.has("term_id")).toBe(false);
    expect(p.has("course_code")).toBe(false);
  });

  it("trims a padded course code prefix", async () => {
    await fetchClassPage({ courseCodePrefix: "  MATH 27  " });
    expect(calledUrl().searchParams.get("course_code")).toBe("MATH 27");
  });

  it("propagates fetch errors to the caller", async () => {
    getJSONFetch.mockRejectedValueOnce(new Error("network down"));
    await expect(fetchClassPage({ termId: 1252 })).rejects.toThrow(
      "network down",
    );
  });
});
