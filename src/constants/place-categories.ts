/**
 * Point-of-interest categories (#537 Phase 2). Places are map markers that are
 * not buildings/dorms: food, landmarks, services, etc.
 */
export const PLACE_CATEGORIES = [
  "food",
  "tourist-spot",
  "landmark",
  "service",
  "transport",
] as const;

export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];

const PLACE_CATEGORY_SET = new Set<string>(PLACE_CATEGORIES);

export const PLACE_CATEGORY_LABELS: Record<PlaceCategory, string> = {
  food: "Food",
  "tourist-spot": "Tourist Spot",
  landmark: "Landmark",
  service: "Service",
  transport: "Transport",
};

export function normalizePlaceCategory(value: unknown): PlaceCategory | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return PLACE_CATEGORY_SET.has(v) ? (v as PlaceCategory) : null;
}

export function placeCategoryLabel(value: unknown): string | null {
  const c = normalizePlaceCategory(value);
  return c ? PLACE_CATEGORY_LABELS[c] : null;
}

export function isLandmarkPlaceCategory(value: unknown): boolean {
  const category = normalizePlaceCategory(value);
  return category === "landmark" || category === "tourist-spot";
}

/** Human-facing grouping used where places share a map or directory with landmarks. */
export function placeDirectoryLabel(value: unknown): string | null {
  const category = normalizePlaceCategory(value);
  if (!category) return null;
  if (category === "landmark") return "Landmark";
  if (category === "tourist-spot") return "Landmark · Tourist spot";
  return `Service / establishment · ${PLACE_CATEGORY_LABELS[category]}`;
}
