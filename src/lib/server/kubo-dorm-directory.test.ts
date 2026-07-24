import { describe, expect, test } from "vitest";
import { fetchKuboDormDirectory } from "./kubo-dorm-directory";

const validPayload = {
  version: 1,
  generatedAt: "2026-07-22T08:00:00.000Z",
  dorms: [
    {
      roomTbaDormId: 12,
      name: "Arable Premier Residences",
      kuboSlug: "arable-premier-residences",
      listingUrl: "https://kubo.community/dorms/arable-premier-residences",
      reservationStatus: "paused",
      reservationUrl: null,
      updatedAt: "2026-07-22T08:00:00.000Z",
    },
  ],
};

describe("fetchKuboDormDirectory", () => {
  test("returns a validated directory and upstream ETag", async () => {
    const fetcher = async () =>
      new Response(JSON.stringify(validPayload), {
        status: 200,
        headers: { ETag: '"directory-v1"' },
      });

    await expect(
      fetchKuboDormDirectory("https://kubo.community/api/directory", fetcher),
    ).resolves.toEqual({ directory: validPayload, etag: '"directory-v1"' });
  });

  test("rejects non-success and malformed upstream responses", async () => {
    await expect(
      fetchKuboDormDirectory(
        "https://kubo.community/api/directory",
        async () => new Response(null, { status: 503 }),
      ),
    ).rejects.toThrow("HTTP 503");

    await expect(
      fetchKuboDormDirectory(
        "https://kubo.community/api/directory",
        async () => new Response(JSON.stringify({ version: 1, dorms: [] })),
      ),
    ).rejects.toThrow("invalid payload");
  });
});
