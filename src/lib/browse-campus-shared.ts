export type CampusBrowseTab =
  | "buildings"
  | "colleges"
  | "divisions"
  | "organizations";

export function campusBrowseQuery(tab: CampusBrowseTab) {
  return {
    category: "browse" as const,
    type: "result" as const,
    value: tab,
  };
}
