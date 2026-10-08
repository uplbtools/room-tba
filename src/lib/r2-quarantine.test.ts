import { describe, expect, test } from "bun:test";
import {
  QUARANTINE_MAX_AGE_MS,
  buildQuarantineKey,
  isQuarantineKey,
  isQuarantinePrefix,
  keyFromPublicUrl,
  parseImageUrl,
  promotedKeyFor,
  staleQuarantineKeys,
} from "./r2-upload-core";

const BASE = "https://images.room-tba.test";

describe("upload quarantine keys", () => {
  test("contributor uploads land under quarantine/<proposal>/", () => {
    const id = "00000000-0000-4000-8000-000000000abc";
    expect(buildQuarantineKey(12, "image/webp", id)).toBe(
      `quarantine/12/${id}.webp`,
    );
  });

  test("publishers cannot pick the quarantine prefix themselves", () => {
    expect(isQuarantinePrefix("quarantine")).toBe(true);
    expect(isQuarantinePrefix("/quarantine/7/")).toBe(true);
    expect(isQuarantinePrefix("../quarantine")).toBe(true);
    expect(isQuarantinePrefix("events/quarantine")).toBe(false);
    expect(isQuarantinePrefix("buildings")).toBe(false);
  });

  test("maps public URLs back to keys", () => {
    expect(keyFromPublicUrl(`${BASE}/quarantine/1/a.jpg`, `${BASE}/`)).toBe(
      "quarantine/1/a.jpg",
    );
    expect(keyFromPublicUrl("https://evil.test/quarantine/1/a.jpg", BASE)).toBe(
      null,
    );
    expect(isQuarantineKey("quarantine/1/a.jpg")).toBe(true);
    expect(isQuarantineKey("uploads/a.jpg")).toBe(false);
    expect(isQuarantineKey(null)).toBe(false);
  });

  test("approval promotes to the public prefix keeping the random name", () => {
    expect(promotedKeyFor("quarantine/12/abc.webp")).toBe("uploads/abc.webp");
  });
});

describe("parseImageUrl and quarantine", () => {
  const url = `${BASE}/quarantine/3/x.png`;

  test("direct publishes cannot reference an unreviewed upload", () => {
    const parsed = parseImageUrl(url, BASE, "Building image");
    expect(parsed.ok).toBe(false);
  });

  test("proposals may, since approval promotes the file first", () => {
    expect(
      parseImageUrl(url, BASE, "Building image", { allowQuarantine: true }),
    ).toEqual({ ok: true, imageUrl: url, provided: true });
  });
});

describe("staleQuarantineKeys", () => {
  const now = 100 * 24 * 60 * 60 * 1000;
  const old = now - QUARANTINE_MAX_AGE_MS - 1;
  const fresh = now - 60_000;

  test("deletes only old, unreferenced quarantine objects", () => {
    const objects = [
      { key: "quarantine/1/old.jpg", lastModified: old },
      { key: "quarantine/2/used.jpg", lastModified: old },
      { key: "quarantine/3/fresh.jpg", lastModified: fresh },
      { key: "quarantine/4/unknown-age.jpg", lastModified: null },
      { key: "uploads/live.jpg", lastModified: old },
    ];
    expect(
      staleQuarantineKeys(objects, new Set(["quarantine/2/used.jpg"]), now),
    ).toEqual(["quarantine/1/old.jpg"]);
  });
});
