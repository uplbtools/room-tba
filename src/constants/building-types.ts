import type { BuildingData, BuildingType, DormData } from "@lib/types";

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

const BUILDING_TYPE_FILTERS = {
  admin: "administrative-building",
  "non-admin": "class-building",
} satisfies Record<BuildingType, BuildingTypeFilter>;

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

export function buildingMatchesTypeFilter(
  building: BuildingData,
  filter: BuildingTypeFilter,
) {
  if (filter === "all") return true;
  return BUILDING_TYPE_FILTERS[building.buildingType] === filter;
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
): BuildingTypeFilterOption[] {
  const counts = new Map<BuildingTypeFilter, number>();

  for (const building of buildings ?? []) {
    const filter = BUILDING_TYPE_FILTERS[building.buildingType];
    counts.set(filter, (counts.get(filter) ?? 0) + 1);
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
