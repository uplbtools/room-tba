import { describe, expect, test } from "vitest";
import {
  getKuboDormCta,
  kuboDormDirectory,
  parseKuboDormDirectory,
  type KuboDormDirectory,
  type KuboDormDirectoryResponse,
} from "./kubo-dorms";

const directory: KuboDormDirectoryResponse = {
  version: 1,
  generatedAt: "2026-07-22T08:00:00.000Z",
  dorms: [
    {
      name: "Scholar's Dormitory",
      kuboSlug: "scholar-s-dormitory",
      listingUrl: "https://kubo.community/dorms/scholar-s-dormitory",
      updatedAt: "2026-07-22T08:00:00.000Z",
    },
  ],
};

describe("parseKuboDormDirectory", () => {
  test("accepts the versioned Kubo directory", () => {
    expect(parseKuboDormDirectory(directory)).toEqual(directory);
  });

  test("maps Kubo's public listing directory into safe listing links", () => {
    expect(
      parseKuboDormDirectory([
        {
          name: "Scholar's Dormitory",
          slug: "scholar-s-dormitory",
          updatedAt: "2026-07-22T08:00:00.000Z",
        },
      ]),
    ).toEqual(directory);
  });

  test("rejects an unsafe or ambiguous payload", () => {
    expect(
      parseKuboDormDirectory([
        { name: "One", slug: "one", updatedAt: "not-a-date" },
      ]),
    ).toBeNull();
    expect(
      parseKuboDormDirectory([
        { name: "One", slug: "one", updatedAt: directory.generatedAt },
        { name: "One", slug: "other", updatedAt: directory.generatedAt },
      ]),
    ).toBeNull();
  });
});

describe("getKuboDormCta", () => {
  test("links an exact dorm-name match to Kubo", () => {
    expect(
      getKuboDormCta(
        new Map([["scholarsdormitory", directory.dorms[0]]]),
        "Scholar's Dormitory",
      ),
    ).toEqual({
      href: "https://kubo.community/dorms/scholar-s-dormitory",
      label: "Reserve on Kubo",
      ariaLabel:
        "Check availability for Scholar's Dormitory on Kubo (opens in new tab)",
    });
  });

  test.each([
    ["Scholar's Dormitory", "Scholars Dormitory"],
    ["New Dormitory Residence Hall", "New Dormitory RH"],
  ])("accepts spelling variant %s vs %s", (kuboName, dormName) => {
    expect(
      getKuboDormCta(
        new Map([
          [
            kuboName
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "")
              .replace(/residencehall/g, "rh"),
            { ...directory.dorms[0], name: kuboName },
          ],
        ]),
        dormName,
      ),
    ).not.toBeNull();
  });

  test("hides the CTA for an unlinked dorm", () => {
    expect(getKuboDormCta(new Map(), "Westbrook Residences")).toBeNull();
  });

  test("starts empty so an unconfirmed link is never shown", () => {
    let current: KuboDormDirectory | undefined;
    const unsubscribe = kuboDormDirectory.subscribe((value) => {
      current = value;
    });
    unsubscribe();

    expect(current?.size).toBe(0);
  });
});
