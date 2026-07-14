/**
 * Comfort-room facilities a building can list ("saan may bidet?").
 * Stored on buildings.cr_facilities as an array of slugs; unknown slugs are
 * dropped at the API boundary so the set can only grow via this list.
 */
export const CR_FACILITIES = [
  { slug: "bidet", label: "Bidet" },
  { slug: "tissue", label: "Tissue paper" },
  { slug: "soap", label: "Soap" },
  { slug: "hand-dryer", label: "Hand dryer" },
  { slug: "hot-water", label: "Hot water" },
  { slug: "pwd-accessible", label: "PWD-accessible" },
  { slug: "all-gender", label: "All-gender CR" },
] as const;

export type CrFacilitySlug = (typeof CR_FACILITIES)[number]["slug"];

const LABELS = new Map<string, string>(
  CR_FACILITIES.map((f) => [f.slug, f.label]),
);

export function crFacilityLabel(slug: string): string {
  return LABELS.get(slug) ?? slug;
}

/** Keep only known slugs, deduped, in canonical (display) order. */
export function sanitizeCrFacilities(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const given = new Set(value.filter((item) => typeof item === "string"));
  return CR_FACILITIES.filter((f) => given.has(f.slug)).map((f) => f.slug);
}
