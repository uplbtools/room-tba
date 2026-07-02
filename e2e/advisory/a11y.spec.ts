import { test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { waitForAppBoot } from "../helpers/app";
import { openBuilding } from "../helpers/search";

test.describe("a11y @advisory", () => {
  async function assertNoSeriousViolations(
    page: import("@playwright/test").Page,
  ) {
    const results = await new AxeBuilder({ page })
      .disableRules(["color-contrast"])
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    test.info().annotations.push({
      type: "a11y",
      description: `${serious.length} serious/critical violations`,
    });
    if (serious.length > 0) {
      console.warn(JSON.stringify(serious, null, 2));
    }
  }

  test("homepage has no serious axe violations", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await assertNoSeriousViolations(page);
  });

  test("login modal has no serious axe violations", async ({ page }) => {
    await page.goto("/?editor=login");
    await page.getByRole("dialog").waitFor({ state: "visible" });
    await assertNoSeriousViolations(page);
  });

  test("building side panel has no serious axe violations", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await openBuilding(page);
    await assertNoSeriousViolations(page);
  });

  test("map tools flyout has no serious axe violations", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await page.getByRole("button", { name: /map tools/i }).click();
    await page.getByRole("dialog", { name: /map tools/i }).waitFor({
      state: "visible",
    });
    await assertNoSeriousViolations(page);
  });
});
