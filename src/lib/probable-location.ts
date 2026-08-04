/**
 * Probable location for Room TBA sections (#846) — pure logic, no DB.
 *
 * Resolution order (see docs/amis-com-refresh-runbook.md § TBA sections):
 *   1. Department link: acad_org → data/acad-orgs.json → the department's
 *      organizations-table entity, when that entity has a map position.
 *   2. Course history: modal building among same-course sections that have an
 *      assigned room, across all terms, weighting newer terms higher.
 *   3. Department history: same aggregate over the acad_org's sections.
 *   4. Decoded department name alone (no pin).
 * The service wrapper (src/lib/services/probable-location.ts) feeds this rows;
 * keep everything here deterministic and unit-testable.
 */
import { decodeAcadOrg } from "./acad-orgs";
import { normalizeAlias } from "./site";

export type ProbableLocationSource =
  | "department"
  | "course-history"
  | "dept-history";

export type ProbableLocation = {
  source: ProbableLocationSource;
  /** Decoded department / institute name, when acad_org is curated. */
  deptName?: string;
  /** College code (decode entry first, else the row's acad_group). */
  collegeCode?: string;
  /** organizations.name to select on the map (department source only). */
  orgName?: string;
  /** Modal building (history sources only). */
  buildingId?: number;
  buildingName?: string;
};

/** One aggregate row: sections of a course/org that met in this building this term. */
export type HistoryRow = {
  buildingId: number;
  buildingName: string;
  termId: number;
  sections: number;
};

export type OrgEntityRow = {
  name: string;
  lat: number | null;
  lon: number | null;
  buildingId: number | null;
};

/** Match a department name against org entities; "(ACRONYM)" suffixes on the
 * entity name are ignored, mirroring scripts/seed-uplb-directory.ts. */
export function findDeptEntity(
  orgs: OrgEntityRow[],
  wanted: string,
): OrgEntityRow | null {
  const wantedKey = normalizeAlias(wanted);
  if (!wantedKey) return null;
  for (const org of orgs) {
    if (normalizeAlias(org.name) === wantedKey) return org;
    const bare = org.name.replace(/\s*\([^)]*\)\s*$/, "");
    if (bare !== org.name && normalizeAlias(bare) === wantedKey) return org;
  }
  return null;
}

function isLocatable(org: OrgEntityRow): boolean {
  return (org.lat != null && org.lon != null) || org.buildingId != null;
}

/**
 * Modal building over history rows; newer terms weigh more.
 * ponytail: linear weight by chronological term rank (oldest=1); swap in a
 * decay curve only if real data shows stale buildings still winning.
 */
export function rankBuildingsByHistory(
  rows: HistoryRow[],
): { buildingId: number; buildingName: string } | null {
  if (rows.length === 0) return null;
  const termIds = [...new Set(rows.map((row) => row.termId))].sort(
    (a, b) => a - b,
  );
  const termWeight = new Map(termIds.map((id, index) => [id, index + 1]));
  const scores = new Map<
    number,
    { buildingName: string; score: number; latestTermId: number }
  >();
  for (const row of rows) {
    const weight = (termWeight.get(row.termId) ?? 1) * row.sections;
    const current = scores.get(row.buildingId);
    if (current) {
      current.score += weight;
      current.latestTermId = Math.max(current.latestTermId, row.termId);
    } else {
      scores.set(row.buildingId, {
        buildingName: row.buildingName,
        score: weight,
        latestTermId: row.termId,
      });
    }
  }
  let best: {
    buildingId: number;
    buildingName: string;
    score: number;
    latestTermId: number;
  } | null = null;
  for (const [buildingId, entry] of scores) {
    if (
      !best ||
      entry.score > best.score ||
      (entry.score === best.score && entry.latestTermId > best.latestTermId)
    ) {
      best = { buildingId, ...entry };
    }
  }
  return best
    ? { buildingId: best.buildingId, buildingName: best.buildingName }
    : null;
}

/**
 * Full fallback order over already-fetched inputs. Callers may pass empty
 * histories when they short-circuited fetching (department pin resolved).
 */
export function resolveProbableLocation(input: {
  acadOrg: string | null;
  acadGroup: string | null;
  orgs: OrgEntityRow[];
  courseHistory: HistoryRow[];
  deptHistory: HistoryRow[];
}): ProbableLocation | null {
  const entry = decodeAcadOrg(input.acadOrg);
  const collegeCode = entry?.collegeCode ?? input.acadGroup ?? undefined;
  const deptName = entry?.name;

  if (entry) {
    const entity = findDeptEntity(input.orgs, entry.entityName ?? entry.name);
    if (entity && isLocatable(entity)) {
      return {
        source: "department",
        deptName,
        collegeCode,
        orgName: entity.name,
      };
    }
  }

  const viaCourse = rankBuildingsByHistory(input.courseHistory);
  if (viaCourse) {
    return { source: "course-history", deptName, collegeCode, ...viaCourse };
  }

  const viaDept = rankBuildingsByHistory(input.deptHistory);
  if (viaDept) {
    return { source: "dept-history", deptName, collegeCode, ...viaDept };
  }

  if (deptName) return { source: "department", deptName, collegeCode };
  return null;
}
