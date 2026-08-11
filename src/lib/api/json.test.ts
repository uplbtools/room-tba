import { describe, expect, test } from "bun:test";
import { PUBLIC_READ_CACHE_CONTROL, cachedJson, json } from "./json";

describe("cachedJson", () => {
  test("sets public edge Cache-Control on success bodies", async () => {
    const res = cachedJson({ ok: true });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/json");
    expect(res.headers.get("Cache-Control")).toBe(PUBLIC_READ_CACHE_CONTROL);
    expect(await res.json()).toEqual({ ok: true });
  });

  test("merges extra headers without dropping cache", () => {
    const res = cachedJson([], 200, { "Access-Control-Allow-Origin": "*" });
    expect(res.headers.get("Cache-Control")).toBe(PUBLIC_READ_CACHE_CONTROL);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  test("does not cache non-2xx statuses", () => {
    const res = cachedJson({ error: "nope" }, 500);
    expect(res.headers.get("Cache-Control")).toBeNull();
  });

  test("plain json stays uncached", () => {
    const res = json({ error: "nope" }, 400);
    expect(res.headers.get("Cache-Control")).toBeNull();
  });
});
