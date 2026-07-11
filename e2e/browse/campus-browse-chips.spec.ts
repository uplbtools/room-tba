import { test, expect, type Page } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { openAppSidebar } from "../helpers/map-tools";

// Browsing moved from search-chrome chips to the sidebar rail; these specs
// drive the sidebar entries and assert each directory panel opens.
test.describe("sidebar campus browsing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
  });

  async function browse(page: Page, name: RegExp | string) {
    const sidebar = await openAppSidebar(page);
    await sidebar.getByRole("button", { name }).click();
  }

  test("Buildings opens browse panel with building list", async ({ page }) => {
    await browse(page, /^buildings$/i);
    await expect(page.getByRole("heading", { name: /Buildings/i })).toBeVisible(
      { timeout: 10_000 },
    );
  });

  test("Colleges opens browse panel on colleges tab", async ({ page }) => {
    await browse(page, /^colleges$/i);
    await expect(page.getByRole("heading", { name: /Colleges/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("Divisions opens browse panel on divisions tab", async ({ page }) => {
    await browse(page, /^divisions$/i);
    await expect(page.getByRole("heading", { name: /Divisions/i })).toBeVisible(
      { timeout: 10_000 },
    );
  });

  test("Student organizations opens its own browse panel", async ({ page }) => {
    await browse(page, /^orgs$/i);
    await expect(
      page.getByRole("heading", { name: "Student Organizations" }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("Offices and units opens a separate list and its usual detail view @desktop-only", async ({
    page,
  }) => {
    await browse(page, /units & offices/i);
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

  test("sidebar opens landmark and service directories", async ({ page }) => {
    await browse(page, /^landmarks$/i);
    await expect(page.getByRole("heading", { name: "Landmarks" })).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole("button", { name: "Close browse list" }).click();
    await browse(page, /services & establishments/i);
    await expect(
      page.getByRole("heading", { name: "Services & Establishments" }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("Jeepney routes opens the transit browse panel", async ({ page }) => {
    await browse(page, /^jeepney routes$/i);
    await expect(
      page.getByRole("heading", { name: /Jeepney Routes/i }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("button", { name: /open .+ route details/i }).first(),
    ).toBeVisible();
  });

  test("term selector stays in the search chrome", async ({ page }) => {
    await expect(page.locator(".term-filter-chip")).toBeVisible({
      timeout: 10_000,
    });
    // The retired browse chips are gone from the search chrome.
    await expect(page.locator(".campus-browse-chips")).toHaveCount(0);
  });

  test("mobile retracts navigation while a detail drawer is open", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await browse(page, /^landmarks$/i);
    await expect(page.getByRole("heading", { name: "Landmarks" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator("aside")).toHaveClass(/retracted/);
  });

  test("Classes opens class list from the sidebar", async ({ page }) => {
    await browse(page, /^classes$/i);
    await expect(page.getByText(/All classes/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
