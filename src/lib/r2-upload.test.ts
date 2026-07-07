import { describe, expect, test } from "bun:test";
import {
  buildUploadKey,
  detectImageContentType,
  parseEventImageUrl,
  parseImageUrl,
  sanitizeUploadPrefix,
} from "./r2-upload-core";

describe("sanitizeUploadPrefix", () => {
  test("strips traversal and unsafe characters", () => {
    expect(sanitizeUploadPrefix("../events/foo bar")).toBe("events/foo-bar");
    expect(sanitizeUploadPrefix("/events/slug/")).toBe("events/slug");
  });

  test("falls back to uploads", () => {
    expect(sanitizeUploadPrefix("")).toBe("uploads");
    expect(sanitizeUploadPrefix("///")).toBe("uploads");
  });
});

describe("detectImageContentType", () => {
  test("detects jpeg, png, and webp signatures", () => {
    expect(
      detectImageContentType(new Uint8Array([0xff, 0xd8, 0xff, 0x00])),
    ).toBe("image/jpeg");
    expect(
      detectImageContentType(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
      ),
    ).toBe("image/png");
    expect(
      detectImageContentType(
        new Uint8Array([
          0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42,
          0x50,
        ]),
      ),
    ).toBe("image/webp");
  });
});

describe("buildUploadKey", () => {
  test("uses sanitized prefix and extension", () => {
    const key = buildUploadKey("events/my-event", "image/png", "test-id");
    expect(key).toBe("events/my-event/test-id.png");
  });
});

describe("parseEventImageUrl", () => {
  test("accepts null and empty values", () => {
    expect(parseEventImageUrl(undefined)).toEqual({
      ok: true,
      imageUrl: null,
      provided: false,
    });
    expect(parseEventImageUrl(null)).toEqual({
      ok: true,
      imageUrl: null,
      provided: true,
    });
  });

  test("requires https and upload storage origin", () => {
    expect(parseEventImageUrl("http://example.com/a.jpg")).toEqual({
      ok: false,
      error: "Event image URL must use HTTPS",
    });
    expect(parseEventImageUrl("https://cdn.example.com/events/a.jpg")).toEqual({
      ok: false,
      error:
        "Event image URL requires upload storage (R2_PUBLIC_URL) to be configured",
    });
    expect(
      parseEventImageUrl(
        "https://cdn.example.com/events/a.jpg",
        "https://cdn.example.com",
      ),
    ).toEqual({
      ok: true,
      imageUrl: "https://cdn.example.com/events/a.jpg",
      provided: true,
    });
    expect(
      parseEventImageUrl(
        "https://evil.example/photo.jpg",
        "https://cdn.example.com",
      ),
    ).toEqual({
      ok: false,
      error: "Event image URL must come from this site's upload storage",
    });
  });
});

describe("parseImageUrl (generic entity images, #191)", () => {
  test("uses the given label in error messages", () => {
    expect(
      parseImageUrl(
        "http://cdn.example.com/a.jpg",
        "https://cdn.example.com",
        "Building image",
      ),
    ).toEqual({
      ok: false,
      error: "Building image URL must use HTTPS",
    });
    expect(
      parseImageUrl("https://cdn.example.com/a.jpg", null, "Room image"),
    ).toEqual({
      ok: false,
      error:
        "Room image URL requires upload storage (R2_PUBLIC_URL) to be configured",
    });
  });

  test("accepts a valid URL from the configured storage origin", () => {
    expect(
      parseImageUrl(
        "https://cdn.example.com/dorms/a.jpg",
        "https://cdn.example.com",
        "Dorm image",
      ),
    ).toEqual({
      ok: true,
      imageUrl: "https://cdn.example.com/dorms/a.jpg",
      provided: true,
    });
  });

  test("rejects a URL from a different origin", () => {
    expect(
      parseImageUrl(
        "https://evil.example/photo.jpg",
        "https://cdn.example.com",
        "Building image",
      ),
    ).toEqual({
      ok: false,
      error: "Building image URL must come from this site's upload storage",
    });
  });

  test("treats empty string as clearing the image", () => {
    expect(parseImageUrl("", "https://cdn.example.com", "Room image")).toEqual({
      ok: true,
      imageUrl: null,
      provided: true,
    });
  });

  test("defaults to 'Image' label when none given", () => {
    expect(parseImageUrl("http://cdn.example.com/a.jpg")).toEqual({
      ok: false,
      error: "Image URL must use HTTPS",
    });
  });
});
