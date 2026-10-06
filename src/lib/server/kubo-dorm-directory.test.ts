import { describe, expect, test } from "vitest";
import { fetchKuboDormDirectory } from "./kubo-dorm-directory";

const validPayload = [
  {
    name: "Arable Premier Residences",
    slug: "arable-premier-residences",
    updatedAt: "2026-07-22T08:00:00.000Z",
  },
];

describe("fetchKuboDormDirectory", () => {
  test("returns a validated directory and upstream ETag", async () => {
    const fetcher = async () =>
      new Response(JSON.stringify(validPayload), {
        status: 200,
        headers: { ETag: '"directory-v1"' },
      });

    await expect(
      fetchKuboDormDirectory("https://kubo.community/api/directory", fetcher),
    ).resolves.toMatchObject({
      etag: '"directory-v1"',
      directory: {
        dorms: [
          {
            name: "Arable Premier Residences",
            listingUrl:
              "https://kubo.community/dorms/arable-premier-residences",
          },
        ],
      },
    });
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
        async () => new Response(JSON.stringify([{ name: "Missing slug" }])),
      ),
    ).rejects.toThrow("invalid payload");
  });
});
