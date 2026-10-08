import { test, expect } from "@playwright/test";
import { campusSearchBox, waitForAppBoot } from "../helpers/app";
import { E2E_FIXTURES } from "../../scripts/e2e-reset-db";

test.describe("mobile search collapse", () => {
  test("You sheet roundtrip preserves query and panel @mobile", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "mobile only");
    await page.goto("/");
    await waitForAppBoot(page);

    // The redesigned mobile chrome layers the details sheet over the bottom
    // nav, so the old journey (entity open, then menu) no longer exists by
    // design. The regression this guards is the menu roundtrip wiping the
    // typed query, so type without committing a result.
    const search = campusSearchBox(page);
    await search.fill(E2E_FIXTURES.buildingName);
    await search.blur();

    const you = page.getByRole("dialog", { name: "You", exact: true });
    await page.getByRole("button", { name: "You", exact: true }).click();
    await expect(you).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(you).toBeHidden();

    await expect(search).toHaveValue(E2E_FIXTURES.buildingName);
    await search.click();
    await expect(
      page.getByRole("listbox", { name: /search suggestions/i }),
    ).toBeVisible();
  });
});
