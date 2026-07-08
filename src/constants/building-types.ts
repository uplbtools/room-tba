import type { BuildingData, DormData } from "@lib/types";

export type BuildingTypeFilter =
  | "all"
  | "class-building"
  | "administrative-building"
  | "up-managed-dorm"
  | "non-up-managed-dorm";

export type BuildingTypeFilterOption = {
  label: string;
  value: BuildingTypeFilter;
  count: number;
  tone: "all" | "building" | "admin" | "up-dorm" | "non-up-dorm";
};

const ALL_BUILDINGS_OPTION = {
  label: "All",
  value: "all",
  tone: "all",
} as const;

const BUILDING_TYPE_LABELS: Record<BuildingTypeFilter, string> = {
  all: "All",
  "class-building": "Class Building",
  "administrative-building": "Administrative Building",
  "up-managed-dorm": "UP Managed Dorm",
  "non-up-managed-dorm": "Non-UP Managed Dorm",
};

export function getBuildingTypeFilterLabel(filter: BuildingTypeFilter) {
  return BUILDING_TYPE_LABELS[filter];
}

/**
 * A building can hold two roles at once: `buildingType === "admin"` is the
 * stored administrative flag, and hosting classes (derived — it has rooms with
 * classes this term) makes it a class venue. `buildingIdsWithClasses` carries
 * that derived signal; a building that is both admin and a venue matches the
 * "administrative-building" AND "class-building" filters.
 */
export function buildingMatchesTypeFilter(
  building: BuildingData,
  filter: BuildingTypeFilter,
  buildingIdsWithClasses?: Set<number>,
) {
  if (filter === "all") return true;
  if (filter === "administrative-building") {
    return building.buildingType === "admin";
  }
  if (filter === "class-building") {
    return (
      building.buildingType === "non-admin" ||
      (buildingIdsWithClasses?.has(building.id) ?? false)
    );
  }
  return false;
}

export function dormMatchesTypeFilter(
  dorm: DormData,
  filter: BuildingTypeFilter,
) {
  if (filter === "all") return true;
  if (filter === "up-managed-dorm") return dorm.isUpManaged;
  if (filter === "non-up-managed-dorm") return !dorm.isUpManaged;
  return false;
}

export function getBuildingTypeFilterOptions(
  buildings: BuildingData[] | null,
  dorms: DormData[] | null,
  buildingIdsWithClasses?: Set<number>,
): BuildingTypeFilterOption[] {
  const counts = new Map<BuildingTypeFilter, number>();
  const bump = (filter: BuildingTypeFilter) =>
    counts.set(filter, (counts.get(filter) ?? 0) + 1);

  // A building is counted into every bucket it qualifies for — a dual-role
  // building (admin + class venue) increments both.
  for (const building of buildings ?? []) {
    if (building.buildingType === "admin") bump("administrative-building");
    if (
      building.buildingType === "non-admin" ||
      (buildingIdsWithClasses?.has(building.id) ?? false)
    ) {
      bump("class-building");
    }
  }

  for (const dorm of dorms ?? []) {
    const filter = dorm.isUpManaged ? "up-managed-dorm" : "non-up-managed-dorm";
    counts.set(filter, (counts.get(filter) ?? 0) + 1);
  }

  const options: BuildingTypeFilterOption[] = [
    {
      ...ALL_BUILDINGS_OPTION,
      count: (buildings?.length ?? 0) + (dorms?.length ?? 0),
    },
    {
      label: BUILDING_TYPE_LABELS["class-building"],
      value: "class-building",
      count: counts.get("class-building") ?? 0,
      tone: "building",
    },
    {
      label: BUILDING_TYPE_LABELS["administrative-building"],
      value: "administrative-building",
      count: counts.get("administrative-building") ?? 0,
      tone: "admin",
    },
    {
      label: BUILDING_TYPE_LABELS["up-managed-dorm"],
      value: "up-managed-dorm",
      count: counts.get("up-managed-dorm") ?? 0,
      tone: "up-dorm",
    },
    {
      label: BUILDING_TYPE_LABELS["non-up-managed-dorm"],
      value: "non-up-managed-dorm",
      count: counts.get("non-up-managed-dorm") ?? 0,
      tone: "non-up-dorm",
    },
  ];

  return options.filter((option) => option.value === "all" || option.count > 0);
}
