// Pin/dorm filter state. Lives outside index.svelte.ts so ui-stores can
// import it without a module cycle (index imports ui-stores).
import type { BuildingTypeFilter } from "@constants/building-types";

export type DormFilterType = "all" | "up" | "private";

let _dormFilter = $state<DormFilterType>("all");
export const dormFilter = {
  get value() {
    return _dormFilter;
  },
  set(v: DormFilterType) {
    _dormFilter = v;
  },
};

let _buildingTypeFilter = $state<BuildingTypeFilter>("all");
export const buildingTypeFilter = {
  get value() {
    return _buildingTypeFilter;
  },
  set(v: BuildingTypeFilter) {
    _buildingTypeFilter = v;
  },
};
