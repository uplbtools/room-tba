import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";

test.describe("campus browse chips", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
  });

  test("Buildings opens browse panel with building list", async ({ page }) => {
    await page.getByRole("button", { name: "Browse buildings" }).click();
    await expect(page.getByRole("heading", { name: /Buildings/i })).toBeVisible(
      {
        timeout: 10_000,
      },
    );
  });

  test("Colleges opens browse panel on colleges tab", async ({ page }) => {
    await page.getByRole("button", { name: "Browse colleges" }).click();
    await expect(page.getByRole("heading", { name: /Colleges/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("Divisions opens browse panel on divisions tab", async ({ page }) => {
    await page.getByRole("button", { name: "Browse divisions" }).click();
    await expect(page.getByRole("heading", { name: /Divisions/i })).toBeVisible(
      {
        timeout: 10_000,
      },
    );
  });

  test("Student organizations opens its own browse panel", async ({ page }) => {
    await page
      .getByRole("button", { name: "Browse student organizations" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Student Organizations" }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("Offices and units opens a separate list and its usual detail view", async ({
    page,
  }) => {
    await page
      .getByRole("button", { name: "Browse offices and academic units" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Offices & Academic Units" }),
    ).toBeVisible({ timeout: 10_000 });
    await page.locator("button.entity-list-row").first().click();
    await expect(
      page.locator(".entity-detail h2"),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("mobile top bar: term selector does not overlap browse chips", async ({
    page,
  }) => {
    // Regression guard: on the mobile grid shell, the browse-chip row and the
    // term-selector row must be explicitly placed. Auto-placement stuffed them
    // side by side into the menu column, drawing the term selector on top of
    // the chips.
    await page.setViewportSize({ width: 390, height: 844 });
    const chips = page.locator(".campus-browse-chips__container");
    const directoryChips = page.locator(".campus-directory-chips");
    const term = page.locator(".campus-browse-chips__term");
    await expect(chips).toBeVisible();
    await expect(directoryChips).toBeVisible();
    await expect(term).toBeVisible();

    const chipsBox = await chips.boundingBox();
    const termBox = await term.boundingBox();
    if (!chipsBox || !termBox) throw new Error("missing bounding boxes");
    // The term row must start at or below the bottom of the chips row.
    expect(termBox.y).toBeGreaterThanOrEqual(chipsBox.y + chipsBox.height - 1);
    // And both rows span the shell instead of hiding in the 2rem menu column.
    expect(chipsBox.width).toBeGreaterThan(200);

    const orgsBox = await page
      .getByRole("button", { name: "Browse student organizations" })
      .boundingBox();
    const officesBox = await page
      .getByRole("button", { name: "Browse offices and academic units" })
      .boundingBox();
    if (!orgsBox || !officesBox) throw new Error("missing directory chips");
    expect(Math.abs(orgsBox.y - officesBox.y)).toBeLessThanOrEqual(1);
    expect(officesBox.x + officesBox.width).toBeLessThanOrEqual(390);
  });

  test("Classes opens class list without toggling building filter chip", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Browse all classes" }).click();
    await expect(page.getByText(/All classes/i).first()).toBeVisible({
      timeout: 10_000,
    });
    const allFilter = page.getByRole("button", { name: /^All,/i });
    await expect(allFilter).toHaveAttribute("aria-pressed", "false");
    await expect(
      page.getByRole("button", { name: "Browse all classes" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
