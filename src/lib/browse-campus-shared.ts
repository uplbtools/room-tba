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
