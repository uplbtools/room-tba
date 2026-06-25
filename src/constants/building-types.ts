import type { BuildingData, BuildingType } from "../lib/types";

export type BuildingTypeFilter = "all" | BuildingType;

export type BuildingTypeFilterOption = {
  label: string;
  value: BuildingTypeFilter;
  count: number;
};

const ALL_BUILDINGS_OPTION = {
  label: "All",
  value: "all",
} as const;

const BUILDING_TYPE_LABELS: Partial<Record<BuildingType, string>> = {
  admin: "Administrative",
  "non-admin": "Non-administrative",
};

function formatBuildingTypeLabel(type: BuildingType) {
  return (
    BUILDING_TYPE_LABELS[type] ??
    type
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

export function getBuildingTypeFilterLabel(filter: BuildingTypeFilter) {
  if (filter === "all") return ALL_BUILDINGS_OPTION.label;
  return formatBuildingTypeLabel(filter);
}

export function getBuildingTypeFilterOptions(
  buildings: BuildingData[] | null,
): BuildingTypeFilterOption[] {
  const counts = new Map<BuildingType, number>();

  for (const building of buildings ?? []) {
    counts.set(
      building.buildingType,
      (counts.get(building.buildingType) ?? 0) + 1,
    );
  }

  const typeOptions = Array.from(counts.entries())
    .sort(([a], [b]) =>
      formatBuildingTypeLabel(a).localeCompare(formatBuildingTypeLabel(b)),
    )
    .map(([value, count]) => ({
      label: formatBuildingTypeLabel(value),
      value,
      count,
    }));

  return [
    {
      ...ALL_BUILDINGS_OPTION,
      count: buildings?.length ?? 0,
    },
    ...typeOptions,
  ];
}
