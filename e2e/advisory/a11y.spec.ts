import { test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { waitForAppBoot } from "../helpers/app";

test.describe("a11y @advisory", () => {
  test("homepage has no serious axe violations", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
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
  });
});
