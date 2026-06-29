import { describe, expect, it } from "bun:test";
import {
  aggregateHistoryByEntityType,
  buildRoomProgressRow,
  buildRoomProgressRows,
  computeBuildingBreakdown,
  hasBuildingPin,
  isNonEmptyText,
  missingFieldLabel,
  progressPercent,
  summarizeFieldCounts,
  topBuildingsByGap,
} from "./contributor-progress";

describe("contributor-progress", () => {
  it("treats whitespace-only directions as missing", () => {
    expect(isNonEmptyText("  ")).toBe(false);
    expect(isNonEmptyText("Turn left at the lobby")).toBe(true);
  });

  it("builds room completeness from directions, schedule, and position", () => {
    const row = buildRoomProgressRow({
      id: 1,
      code: "PSLH 4",
      buildingId: 9,
      directions: "Near the stairs",
      classCount: 2,
      hasPosition: false,
    });

    expect(row.fields).toEqual({
      directions: true,
      schedule: true,
      position: false,
    });
    expect(row.missingFields).toEqual(["position"]);
    expect(missingFieldLabel("PSLH 4", "position")).toBe(
      "PSLH 4 — floor plan pin missing",
    );
  });

  it("summarizes campus room field counts", () => {
    const rows = buildRoomProgressRows([
      {
        id: 1,
        code: "A",
        buildingId: 1,
        directions: "x",
        classCount: 1,
        hasPosition: true,
      },
      {
        id: 2,
        code: "B",
        buildingId: 1,
        directions: null,
        classCount: 0,
        hasPosition: false,
      },
    ]);

    expect(summarizeFieldCounts(rows)).toEqual({
      directions: { filled: 1, total: 2 },
      schedule: { filled: 1, total: 2 },
      position: { filled: 1, total: 2 },
    });
    expect(progressPercent(1, 2)).toBe(50);
  });

  it("ranks buildings with the largest gaps first", () => {
    const rows = buildRoomProgressRows([
      {
        id: 1,
        code: "A1",
        buildingId: 1,
        directions: "x",
        classCount: 1,
        hasPosition: true,
      },
      {
        id: 2,
        code: "A2",
        buildingId: 1,
        directions: "x",
        classCount: 1,
        hasPosition: true,
      },
      {
        id: 3,
        code: "B1",
        buildingId: 2,
        directions: null,
        classCount: 0,
        hasPosition: false,
      },
      {
        id: 4,
        code: "B2",
        buildingId: 2,
        directions: null,
        classCount: 0,
        hasPosition: false,
      },
    ]);

    const names = new Map([
      [1, "Alpha Hall"],
      [2, "Beta Hall"],
    ]);
    const breakdown = computeBuildingBreakdown(rows, names);
    expect(breakdown[0]?.buildingName).toBe("Beta Hall");
    expect(breakdown[0]?.gapScore).toBeGreaterThan(breakdown[1]?.gapScore ?? 0);
    expect(topBuildingsByGap(breakdown, 1)).toHaveLength(1);
  });

  it("aggregates editor history counts by entity type", () => {
    expect(
      aggregateHistoryByEntityType([
        { entityType: "room", count: 7 },
        { entityType: "building", count: 2 },
      ]),
    ).toEqual({
      totalEdits: 9,
      byEntityType: {
        room: 7,
        building: 2,
      },
    });
  });

  it("detects building pins from finite coordinates", () => {
    expect(hasBuildingPin(14.65, 121.07)).toBe(true);
    expect(hasBuildingPin(null, 121)).toBe(false);
  });
});
