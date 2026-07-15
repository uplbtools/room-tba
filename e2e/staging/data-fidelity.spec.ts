import { test, expect } from "@playwright/test";
import { campusSearchBox, waitForAppBoot } from "../helpers/app";
import { searchSuggestions } from "../helpers/search";

test.describe("staging data fidelity", () => {
  test("search returns a campus building suggestion", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await campusSearchBox(page).fill("Palma");
    await expect(
      searchSuggestions(page).getByRole("button").first(),
    ).toBeVisible({
      timeout: 20_000,
    });
  });

  test("term selector shows an active semester", async ({ page }) => {
    // The term chip moved off the base map chrome into entity/class panels, so
    // it is no longer on the plain boot. Verify the data-fidelity intent
    // directly: staging serves terms with an active semester.
    const terms = await page.request
      .get("/api/terms")
      .then((r) => r.json() as Promise<Array<{ isActive: boolean }>>);
    expect(terms.length).toBeGreaterThan(0);
    expect(terms.some((t) => t.isActive)).toBe(true);
  });
});
