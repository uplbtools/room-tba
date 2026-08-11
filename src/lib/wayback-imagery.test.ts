import { describe, expect, test } from "bun:test";
import type { WaybackItem } from "@esri/wayback-core";
import { selectWaybackYears, toWaybackTileUrl } from "@lib/wayback-imagery";

const item = (releaseDateLabel: string): WaybackItem => ({
  itemID: releaseDateLabel,
  itemTitle: releaseDateLabel,
  itemURL: "https://wayback.example/tile/{level}/{row}/{col}",
  metadataLayerItemID: "metadata",
  metadataLayerUrl: "https://wayback.example/metadata",
  releaseNum: Number(releaseDateLabel.replaceAll("-", "")),
  releaseDateLabel,
  releaseDatetime: Date.parse(`${releaseDateLabel}T00:00:00Z`),
});

describe("Wayback imagery", () => {
  test("uses MapLibre tile tokens", () => {
    expect(toWaybackTileUrl(item("2024-01-01").itemURL)).toBe(
      "https://wayback.example/tile/{z}/{y}/{x}",
    );
  });

  test("keeps the newest locally changed release for every year since 2015", () => {
    expect(
      selectWaybackYears([
        item("2024-10-01"),
        item("2024-02-01"),
        item("2015-07-01"),
        item("2014-12-01"),
      ]).map(({ releaseDateLabel }) => releaseDateLabel),
    ).toEqual(["2024-10-01", "2015-07-01"]);
  });
});
