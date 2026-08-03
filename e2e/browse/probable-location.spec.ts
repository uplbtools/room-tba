import { expect, test } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { openAppSidebar } from "../helpers/map-tools";

/**
 * Room TBA probable location (#846). The seed creates E2E 101 section C (LEC)
 * with no room; its sibling AB meets in E2E Test Hall, so the course-history
 * fallback hints there. Assigned sections must never carry the hint.
 */
test.describe("probable location for Room TBA sections", () => {
  test("class browse shows the hedged hint for the unassigned section", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForAppBoot(page);

    const sidebar = await openAppSidebar(page);
    await sidebar.getByRole("button", { name: /^classes$/i }).click();
    await expect(page.getByText(/All classes/i).first()).toBeVisible({
      timeout: 10_000,
    });

    await expect(
      page.getByText("Usually meets around E2E Test Hall").first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("button", {
        name: /Show probable location of E2E 101 C on the map/i,
      }),
    ).toBeVisible();

    // Exactly one hint: the assigned section (AB, in E2E-101) gets none.
    await expect(page.getByText(/Usually meets around/)).toHaveCount(1);
  });
});
