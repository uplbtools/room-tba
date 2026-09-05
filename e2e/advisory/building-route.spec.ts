import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { openMapTools } from "../helpers/map-tools";

async function openBuildingRouter(page: Page) {
  await openMapTools(page);
  await page.getByRole("button", { name: /walk between buildings/i }).click();
  await expect(
    page.getByRole("region", { name: "Walk between buildings" }),
  ).toBeVisible();
}

async function selectBuildingWithKeyboard(
  page: Page,
  field: "From building" | "To building",
  buildingName: string,
) {
  const input = page.getByLabel(field, { exact: true });
  await input.fill(buildingName);
  await expect(
    page.getByRole("option", { name: buildingName, exact: true }),
  ).toBeVisible();
  await input.press("Enter");
  await expect(input).toHaveValue(buildingName);
}

test.describe("building-to-building walking router @advisory", () => {
  test("keyboard route, swap, offline-after-cache, and scoped a11y stay healthy", async ({
    page,
    context,
  }) => {
    const pageErrors: Error[] = [];
    const externalRouteRequests: string[] = [];

    await page.goto("/");
    await waitForAppBoot(page);
    // Ignore unrelated bootstrap traffic/noise: from here on, errors and
    // routing requests belong to the feature interaction under test.
    page.on("pageerror", (error) => pageErrors.push(error));
    page.on("request", (request) => {
      const url = request.url();
      if (
        url.includes("routing.openstreetmap.de") ||
        url.includes("router.project-osrm.org")
      ) {
        externalRouteRequests.push(url);
      }
    });
    await openBuildingRouter(page);

    // Escape belongs to the expanded combobox first. It must dismiss the
    // suggestion popup without also closing the surrounding Map tools dialog.
    const from = page.getByLabel("From building", { exact: true });
    await from.fill("math");
    await expect(page.getByRole("listbox").first()).toBeVisible();
    await from.press("Escape");
    await expect(page.getByRole("listbox").first()).toBeHidden();
    await expect(
      page.getByRole("dialog", { name: /map tools/i }),
    ).toBeVisible();

    await selectBuildingWithKeyboard(
      page,
      "From building",
      "New Math Building",
    );
    await selectBuildingWithKeyboard(
      page,
      "To building",
      "Physical Sciences Building",
    );

    await expect(page.getByText(/About .* walk/)).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/approximate connectors/i)).toBeVisible();

    const accessibility = await new AxeBuilder({ page })
      .include(".building-router")
      .disableRules(["color-contrast"])
      .analyze();
    const serious = accessibility.violations.filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical",
    );
    expect(
      serious.map((violation) => ({
        id: violation.id,
        help: violation.help,
      })),
    ).toEqual([]);

    // The graph module is now warm in the browser. The same local route core
    // must keep working if connectivity drops; no OSRM/fallback request is
    // necessary for the reversed pair.
    await context.setOffline(true);
    try {
      await page
        .getByRole("button", { name: /swap starting and destination/i })
        .click();
      await expect(
        page.getByLabel("From building", { exact: true }),
      ).toHaveValue("Physical Sciences Building");
      await expect(page.getByLabel("To building", { exact: true })).toHaveValue(
        "New Math Building",
      );
      await expect(page.getByText(/About .* walk/)).toBeVisible({
        timeout: 10_000,
      });
    } finally {
      await context.setOffline(false);
    }

    expect(externalRouteRequests).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test("320px picker and open suggestion list do not overflow horizontally", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 760 });
    await page.goto("/");
    await waitForAppBoot(page);
    await openBuildingRouter(page);

    const from = page.getByLabel("From building", { exact: true });
    await from.fill("building");
    await expect(page.getByRole("listbox").first()).toBeVisible();

    for (const selector of [".building-router", "#map-tools-panel"]) {
      const box = page.locator(selector);
      await expect(box).toBeVisible();
      const overflow = await box.evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(
        overflow.clientWidth + 1,
      );
    }
  });
});
