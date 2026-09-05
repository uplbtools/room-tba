export type BuildingRouteCoverageRow = {
  buildingName: string;
};

export type BuildingRouteSourceCoverage = {
  auditRowCount: number;
  referenceRowCount: number;
  auditUniqueCount: number;
  referenceUniqueCount: number;
  matchedCount: number;
  missingFromAudit: string[];
  extraInAudit: string[];
  duplicateAuditNames: string[];
  duplicateReferenceNames: string[];
  complete: boolean;
};

function normalizeBuildingName(name: string): string {
  return name.trim();
}

function sortedUnique(names: string[]): string[] {
  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}

function duplicateNames(names: string[]): string[] {
  const counts = new Map<string, number>();
  for (const rawName of names) {
    const name = normalizeBuildingName(rawName);
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([name]) => name)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Extract building names from the checked-in landmark-image manifest.
 *
 * That manifest is useful as a deterministic API-derived canary because its
 * generator reads `/api/buildings`, but it is not the canonical routing data
 * source. A live API comparison remains the authority before claiming that
 * every currently selectable building has been audited.
 */
export function buildingNamesFromLandmarkManifest(
  manifest: Record<string, unknown>,
): string[] {
  return Object.keys(manifest)
    .filter((key) => key.startsWith("building:"))
    .map((key) => normalizeBuildingName(key.slice("building:".length)))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

export function compareBuildingRouteSourceCoverage(
  auditBuildings: BuildingRouteCoverageRow[],
  referenceBuildingNames: string[],
): BuildingRouteSourceCoverage {
  const auditNames = auditBuildings
    .map((building) => normalizeBuildingName(building.buildingName))
    .filter(Boolean);
  const referenceNames = referenceBuildingNames
    .map(normalizeBuildingName)
    .filter(Boolean);

  const auditUnique = sortedUnique(auditNames);
  const referenceUnique = sortedUnique(referenceNames);
  const auditSet = new Set(auditUnique);
  const referenceSet = new Set(referenceUnique);

  const missingFromAudit = referenceUnique.filter((name) => !auditSet.has(name));
  const extraInAudit = auditUnique.filter((name) => !referenceSet.has(name));
  const duplicateAuditNames = duplicateNames(auditNames);
  const duplicateReferenceNames = duplicateNames(referenceNames);
  const matchedCount = referenceUnique.filter((name) => auditSet.has(name)).length;

  return {
    auditRowCount: auditBuildings.length,
    referenceRowCount: referenceBuildingNames.length,
    auditUniqueCount: auditUnique.length,
    referenceUniqueCount: referenceUnique.length,
    matchedCount,
    missingFromAudit,
    extraInAudit,
    duplicateAuditNames,
    duplicateReferenceNames,
    complete:
      missingFromAudit.length === 0 &&
      extraInAudit.length === 0 &&
      duplicateAuditNames.length === 0 &&
      duplicateReferenceNames.length === 0,
  };
}
