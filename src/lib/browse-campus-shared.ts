export type CampusBrowseTab =
  | "buildings"
  | "dorms"
  | "colleges"
  | "divisions"
  | "organizations"
  | "offices"
  | "landmarks"
  | "services";

export function campusBrowseQuery(tab: CampusBrowseTab) {
  return {
    category: "browse" as const,
    type: "result" as const,
    value: tab,
  };
}
