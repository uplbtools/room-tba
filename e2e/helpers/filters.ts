import type { Locator, Page } from "@playwright/test";

export function buildingPinFilters(page: Page): Locator {
  return page.getByRole("toolbar", { name: "Building pin filters" });
}

/** aria-label is "{label}, {count} pins" — e.g. "All, 2 pins". */
export function buildingPinFilterButton(page: Page, label: RegExp) {
  return buildingPinFilters(page).getByRole("button", { name: label });
}
