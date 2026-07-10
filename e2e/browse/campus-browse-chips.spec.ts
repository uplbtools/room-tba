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
    const office = page.locator("button.entity-list-row").first();
    const officeName = await office
      .locator(".entity-list-row__label")
      .textContent();
    if (!officeName) throw new Error("missing office name");
    await office.click();
    await expect(page.locator(".entity-detail h2")).toBeVisible({
      timeout: 10_000,
    });

    const pin = page.locator(`.map-entity-pin[aria-label="${officeName}"]`);
    await expect(pin).toHaveClass(/active/);
    await expect(pin.locator("svg")).toHaveClass(/landmark/);

    await page.getByRole("button", { name: "Collapse details panel" }).click();
    await expect(page.locator("#side-panel-details")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    await pin.click();
    await expect(page.locator("#side-panel-details")).toHaveAttribute(
      "aria-hidden",
      "false",
    );
  });

  test("mobile top bar keeps browse and term controls in one scroll row", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const controls = page.locator(".map-search-chrome__chips");
    const chips = page.locator(".campus-browse-chips");
    const term = page.locator(".term-filter-chip");
    await expect(controls).toBeVisible();
    await expect(chips).toBeVisible();
    await expect(term).toBeVisible();

    const controlsBox = await controls.boundingBox();
    const chipsBox = await chips.boundingBox();
    const termBox = await term.boundingBox();
    if (!controlsBox || !chipsBox || !termBox) {
      throw new Error("missing compact controls");
    }
    expect(Math.abs(chipsBox.y - termBox.y)).toBeLessThanOrEqual(1);
    expect(chipsBox.y).toBeGreaterThanOrEqual(controlsBox.y);
    expect(controlsBox.height).toBeLessThan(56);
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
