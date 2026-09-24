import { describe, expect, test } from "bun:test";
import auditBuildingsJson from "../../exports/deep-research/buildings.json";
import landmarkImagesJson from "../../src/constants/landmark-images.json";
import {
  buildingNamesFromLandmarkManifest,
  compareBuildingRouteSourceCoverage,
} from "./building-route-source-coverage";

describe("building route source coverage", () => {
  test("normalizes surrounding whitespace without hiding spelling changes", () => {
    const coverage = compareBuildingRouteSourceCoverage(
      [{ buildingName: "Forest Products and Paper Science\t" }],
      ["Forest Products and Paper Science"],
    );

    expect(coverage.complete).toBe(true);
    expect(coverage.matchedCount).toBe(1);
  });

  test("reports missing, extra, and duplicate identities deterministically", () => {
    const coverage = compareBuildingRouteSourceCoverage(
      [
        { buildingName: "B Building" },
        { buildingName: "A Building" },
        { buildingName: "A Building " },
        { buildingName: "Legacy Building" },
      ],
      ["A Building", "B Building", "C Building", "C Building"],
    );

    expect(coverage.complete).toBe(false);
    expect(coverage.missingFromAudit).toEqual(["C Building"]);
    expect(coverage.extraInAudit).toEqual(["Legacy Building"]);
    expect(coverage.duplicateAuditNames).toEqual(["A Building"]);
    expect(coverage.duplicateReferenceNames).toEqual(["C Building"]);
  });

  test("extracts only building keys from the landmark manifest", () => {
    expect(
      buildingNamesFromLandmarkManifest({
        "building:Beta": {},
        "dorm:Ignore me": {},
        "building: Alpha ": {},
      }),
    ).toEqual(["Alpha", "Beta"]);
  });

  test("makes the checked-in 52-versus-58 audit gap explicit", () => {
    const referenceNames = buildingNamesFromLandmarkManifest(
      landmarkImagesJson as Record<string, unknown>,
    );
    const coverage = compareBuildingRouteSourceCoverage(
      auditBuildingsJson,
      referenceNames,
    );

    expect(coverage.auditRowCount).toBe(52);
    expect(coverage.referenceRowCount).toBe(58);
    expect(coverage.duplicateAuditNames).toEqual([]);
    expect(coverage.duplicateReferenceNames).toEqual([]);
    expect(coverage.extraInAudit).toEqual([]);
    expect(coverage.missingFromAudit).toEqual([
      "4Boys House",
      "Old Agronomy Headhouse",
      "Old Makiling School",
      "Raymundo Gate",
      "Student Union Building",
      "UPLB Rural Economic Development and Renewable Energy Center (REDREC)",
    ]);
    expect(coverage.complete).toBe(false);
  });
});
