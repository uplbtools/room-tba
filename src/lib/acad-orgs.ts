/**
 * Decode AMIS `acad_org` department codes (#846). Data file:
 * data/acad-orgs.json — curated, editors extend it code by code; unknown
 * codes return null and callers fall back to the `acad_group` college code
 * (and room-history hints) instead.
 */
import rawAcadOrgs from "../../data/acad-orgs.json";

export type AcadOrgEntry = {
  /** Human department / institute name, e.g. "Institute of Computer Science". */
  name: string;
  /** College code as AMIS reports it in acad_group, e.g. "CAS". */
  collegeCode?: string;
  /** organizations.name to pin on the map when it differs from `name`. */
  entityName?: string;
};

const entries = new Map<string, AcadOrgEntry>(
  Object.entries(rawAcadOrgs as Record<string, unknown>)
    .filter(
      (pair): pair is [string, AcadOrgEntry] =>
        !pair[0].startsWith("$") &&
        typeof (pair[1] as AcadOrgEntry)?.name === "string",
    )
    // AMIS codes are mixed-case ("LBIoP"); match case-insensitively.
    .map(([code, entry]) => [code.toUpperCase(), entry]),
);

/** Decode an AMIS acad_org code; null when uncurated (caller falls back). */
export function decodeAcadOrg(
  code: string | null | undefined,
): AcadOrgEntry | null {
  if (!code) return null;
  return entries.get(code.trim().toUpperCase()) ?? null;
}
