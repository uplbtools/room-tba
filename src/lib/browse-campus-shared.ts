export type CampusBrowseTab =
  | "buildings"
  | "dorms"
  | "colleges"
  | "divisions"
  | "organizations"
  | "offices"
  | "landmarks"
  | "services"
  | "jeepney";

export function campusBrowseQuery(tab: CampusBrowseTab) {
  return {
    category: "browse" as const,
    type: "result" as const,
    value: tab,
  };
}

/**
 * What the search bar reads while a browse list is open. The list is the
 * search result for this label, so the bar's own X closes it (there is no
 * second close button or filter box inside the sheet).
 */
export const CAMPUS_BROWSE_LABELS: Record<CampusBrowseTab, string> = {
  buildings: "Class Buildings",
  dorms: "Dorms",
  colleges: "Colleges",
  divisions: "Divisions",
  organizations: "Student Organizations",
  offices: "Units and offices",
  landmarks: "Landmarks",
  services: "Food & stores",
  jeepney: "Jeepney routes",
};
