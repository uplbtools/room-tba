/**
 * Compare the checked-in building-routing audit snapshot with a newer building
 * identity source.
 *
 * Deterministic canary (no network):
 *   bun scripts/building-route-source-coverage.ts
 *
 * Checked-in fixture freshness check against a deployment's /api/buildings:
 *   bun scripts/building-route-source-coverage.ts --from-api https://www.uplb.tools
 *   bun scripts/building-route-source-coverage.ts --from-api https://www.uplb.tools --strict
 *
 * `--strict` exits non-zero on any missing/extra/duplicate identity. This means
 * "the checked-in historical fixture is not current", not "a live API-backed
 * endpoint audit cannot be complete". For current live audit evidence, run the
 * endpoint/edge-snap audits themselves with `--from-api` and preserve their
 * source count + fingerprints.
 */
import auditBuildingsJson from "../exports/deep-research/buildings.json";
import auditManifestJson from "../exports/deep-research/manifest.json";
import landmarkImagesJson from "../src/constants/landmark-images.json";
import {
  buildingApiUrl,
  fetchBuildingRouteApiRows,
} from "./lib/building-route-api-source";
import {
  buildingNamesFromLandmarkManifest,
  compareBuildingRouteSourceCoverage,
  type BuildingRouteCoverageRow,
} from "./lib/building-route-source-coverage";

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

const apiBase = argValue("--from-api");
const liveRows = apiBase ? await fetchBuildingRouteApiRows(apiBase) : null;
const referenceNames = liveRows
  ? liveRows.map((building) => building.buildingName)
  : buildingNamesFromLandmarkManifest(
      landmarkImagesJson as Record<string, unknown>,
    );
const referenceKind = apiBase
  ? `live API (${buildingApiUrl(apiBase)})`
  : "checked-in API-derived landmark manifest canary";
const coverage = compareBuildingRouteSourceCoverage(
  auditBuildingsJson as BuildingRouteCoverageRow[],
  referenceNames,
);
const auditExportedAt =
  typeof auditManifestJson.exported_at === "string"
    ? auditManifestJson.exported_at
    : null;

if (hasFlag("--json")) {
  console.log(
    JSON.stringify(
      {
        referenceKind,
        auditExportedAt,
        ...coverage,
      },
      null,
      2,
    ),
  );
} else {
  console.log("Room TBA building-routing source coverage audit");
  console.log(`reference: ${referenceKind}`);
  console.log(`audit export: ${auditExportedAt ?? "unknown"}`);
  console.log(
    `coverage: ${coverage.matchedCount}/${coverage.referenceUniqueCount} reference buildings matched; ` +
      `${coverage.auditUniqueCount} unique checked-in audit buildings`,
  );

  if (coverage.missingFromAudit.length > 0) {
    console.log("\nMissing from checked-in routing audit fixture:");
    for (const name of coverage.missingFromAudit) console.log(`  - ${name}`);
  }
  if (coverage.extraInAudit.length > 0) {
    console.log("\nPresent only in checked-in routing audit fixture:");
    for (const name of coverage.extraInAudit) console.log(`  - ${name}`);
  }
  if (coverage.duplicateAuditNames.length > 0) {
    console.log("\nDuplicate checked-in routing-audit identities:");
    for (const name of coverage.duplicateAuditNames) console.log(`  - ${name}`);
  }
  if (coverage.duplicateReferenceNames.length > 0) {
    console.log("\nDuplicate reference identities:");
    for (const name of coverage.duplicateReferenceNames)
      console.log(`  - ${name}`);
  }
  if (coverage.complete) {
    console.log("\nChecked-in fixture identity coverage matches this reference source.");
  } else {
    console.log(
      "\nCoverage mismatch: do not claim the checked-in routing fixture covers every reference building.",
    );
  }
}

if (hasFlag("--strict") && !coverage.complete) process.exitCode = 1;
