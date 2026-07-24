import { describe, expect, test } from "vitest";
import {
  getKuboDormCta,
  kuboDormDirectory,
  parseKuboDormDirectory,
  type KuboDormDirectory,
  type KuboDormDirectoryResponse,
} from "./kubo-dorms";

const acceptingDirectory: KuboDormDirectoryResponse = {
  version: 1,
  generatedAt: "2026-07-22T08:00:00.000Z",
  dorms: [
    {
      roomTbaDormId: 15,
      name: "Scholar's Dormitory",
      kuboSlug: "scholar-s-dormitory",
      listingUrl: "https://kubo.community/dorms/scholar-s-dormitory",
      reservationStatus: "accepting",
      reservationUrl:
        "https://kubo.community/dorms/scholar-s-dormitory/apply/type",
      updatedAt: "2026-07-22T08:00:00.000Z",
    },
  ],
};

describe("parseKuboDormDirectory", () => {
  test("accepts the versioned Kubo directory", () => {
    expect(parseKuboDormDirectory(acceptingDirectory)).toEqual(
      acceptingDirectory,
    );
  });

  test.each([
    { ...acceptingDirectory, version: 2 },
    {
      ...acceptingDirectory,
      dorms: [acceptingDirectory.dorms[0], acceptingDirectory.dorms[0]],
    },
    {
      ...acceptingDirectory,
      dorms: [
        {
          ...acceptingDirectory.dorms[0],
          listingUrl: "https://example.com/phishing",
        },
      ],
    },
    {
      ...acceptingDirectory,
      dorms: [
        {
          ...acceptingDirectory.dorms[0],
          reservationStatus: "maybe",
        },
      ],
    },
  ])("rejects an unsafe or ambiguous payload", (payload) => {
    expect(parseKuboDormDirectory(payload)).toBeNull();
  });
});

describe("getKuboDormCta", () => {
  test("uses the direct reservation link only while accepting", () => {
    const parsed = parseKuboDormDirectory(acceptingDirectory)!;
    const directory = new Map(
      parsed.dorms.map((record) => [record.roomTbaDormId, record]),
    );

    expect(getKuboDormCta(directory, 15, "Scholar's Dormitory")).toEqual({
      href: "https://kubo.community/dorms/scholar-s-dormitory/apply/type",
      label: "Reserve on Kubo",
      ariaLabel:
        "Reserve a place at Scholar's Dormitory on Kubo (opens in new tab)",
    });
  });

  test("uses the waitlist CTA and falls back to its listing URL", () => {
    const record = {
      ...acceptingDirectory.dorms[0],
      reservationStatus: "waitlist" as const,
      reservationUrl: null,
    };

    expect(
      getKuboDormCta(
        new Map([[record.roomTbaDormId, record]]),
        15,
        "Scholar's Dormitory",
      ),
    ).toEqual({
      href: record.listingUrl,
      label: "Join waitlist on Kubo",
      ariaLabel:
        "Join the waitlist for Scholar's Dormitory on Kubo (opens in new tab)",
    });
  });

  test.each(["paused", "unavailable", "unknown"] as const)(
    "uses the listing link for %s status",
    (reservationStatus) => {
      const record = { ...acceptingDirectory.dorms[0], reservationStatus };
      const cta = getKuboDormCta(
        new Map([[record.roomTbaDormId, record]]),
        15,
        "Scholar's Dormitory",
      );
      expect(cta?.label).toBe("View on Kubo");
      expect(cta?.href).toBe(record.listingUrl);
    },
  );

  test("hides the CTA for an unlinked dorm", () => {
    expect(getKuboDormCta(new Map(), 13, "Westbrook Residences")).toBeNull();
  });

  test("starts empty so an unconfirmed link is never shown", () => {
    let directory: KuboDormDirectory | undefined;
    const unsubscribe = kuboDormDirectory.subscribe((value) => {
      directory = value;
    });
    unsubscribe();

    expect(directory?.size).toBe(0);
  });
});
