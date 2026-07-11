/**
 * Organization / office directory categories (#537 Phase 3) — the map-integrated
 * replacement for a flat directory. Each org/office is pinned to a building or
 * coordinate.
 */
export const ORG_CATEGORIES = [
  "student-org",
  "college-org",
  "office",
  "unit",
  "academic",
  "service",
] as const;

export type OrgCategory = (typeof ORG_CATEGORIES)[number];

const ORG_CATEGORY_SET = new Set<string>(ORG_CATEGORIES);

export const ORG_CATEGORY_LABELS: Record<OrgCategory, string> = {
  "student-org": "Student Org",
  "college-org": "College Org",
  office: "Office",
  unit: "Unit",
  academic: "Academic",
  service: "Service",
};

export function normalizeOrgCategory(value: unknown): OrgCategory | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return ORG_CATEGORY_SET.has(v) ? (v as OrgCategory) : null;
}

export function orgCategoryLabel(value: unknown): string | null {
  const c = normalizeOrgCategory(value);
  return c ? ORG_CATEGORY_LABELS[c] : null;
}

export function isStudentOrganization(value: unknown): boolean {
  const category = normalizeOrgCategory(value);
  return category === "student-org" || category === "college-org";
}
