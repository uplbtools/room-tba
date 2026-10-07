import { test, expect, type Page } from "@playwright/test";
import { gotoHome, waitForAppBoot } from "../helpers/app";
import { openCampusDirectory } from "../helpers/map-tools";

test.describe("campus browsing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
  });

  async function browse(
    page: Page,
    directory:
      | "buildings"
      | "colleges"
      | "divisions"
      | "organizations"
      | "offices"
      | "classes"
      | "jeepney"
      | "landmarks"
      | "services",
  ) {
    await openCampusDirectory(page, directory);
  }

  test("Buildings opens browse panel with building list", async ({ page }) => {
    await browse(page, "buildings");
    await expect(page.getByRole("heading", { name: /Buildings/i })).toBeVisible(
      { timeout: 10_000 },
    );
  });

  test("Colleges opens browse panel on colleges tab", async ({ page }) => {
    await browse(page, "colleges");
    await expect(page.getByRole("heading", { name: /Colleges/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("Divisions opens browse panel on divisions tab", async ({ page }) => {
    await browse(page, "divisions");
    await expect(page.getByRole("heading", { name: /Divisions/i })).toBeVisible(
      { timeout: 10_000 },
    );
  });

  test("Student organizations opens its own browse panel", async ({ page }) => {
    await browse(page, "organizations");
    await expect(
      page.getByRole("heading", { name: "Student Organizations" }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("Offices and units opens a separate list and its usual detail view @desktop-only", async ({
    page,
  }) => {
    await browse(page, "offices");
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
    await pin.click({ force: true });
    await expect(page.locator("#side-panel-details")).toHaveAttribute(
      "aria-hidden",
      "false",
    );
  });

  test("map filters open landmark and service directories", async ({
    page,
  }) => {
    await browse(page, "landmarks");
    await expect(page.getByRole("heading", { name: "Landmarks" })).toBeVisible({
      timeout: 10_000,
    });

    // The list has no close button or filter box of its own: the search bar
    // names it and its X is the one way out. The next chip replaces it.
    await expect(page.getByRole("searchbox")).toHaveValue("Landmarks");
    await expect(page.locator(".entity-panel-filter")).toHaveCount(0);
    await browse(page, "services");
    await expect(
      page.getByRole("heading", { name: "Food & stores" }),
    ).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Close details" }).click();
    await expect(
      page.getByRole("heading", { name: "Food & stores" }),
    ).toBeHidden();
  });

  test("Jeepney routes opens the transit browse panel", async ({ page }) => {
    // The route line, stop circles and direction arrows are drawn in one
    // pass; a failed draw logs this warning instead of throwing.
    const drawFailures: string[] = [];
    page.on("console", (message) => {
      if (message.text().includes("jeepney route draw failed")) {
        drawFailures.push(message.text());
      }
    });
    await browse(page, "jeepney");
    await expect(
      page.getByRole("heading", { name: /Jeepney (& Bus )?Routes/i }),
    ).toBeVisible({ timeout: 10_000 });
    const route = page.locator("button.entity-list-row").first();
    await expect(route).toBeVisible();
    await route.click();
    await expect(
      page.getByRole("button", { name: /copy link to .+ route/i }),
    ).toBeVisible();
    await expect(page.locator(".jeepney-stop-pin").first()).toBeVisible();
    // The draw retries on styledata, so give it a moment before judging.
    await page.waitForTimeout(1_500);
    expect(
      drawFailures.filter((m) => !/style is not done loading/i.test(m)),
    ).toEqual([]);

    // A focused route has a clear way out back to the plain map.
    await page
      .getByRole("button", { name: /close route and return to the map/i })
      .click();
    await expect(page.locator(".jeepney-stop-pin")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /copy link to .+ route/i }),
    ).toHaveCount(0);
  });

  test("classes panel includes term selector", async ({ page }) => {
    await browse(page, "classes");
    await expect(
      page.getByRole("heading", { name: "Classes", exact: true }).first(),
    ).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByRole("button", { name: /E2E 2nd Sem|academic term/i }).first(),
    ).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole("button", { name: "App menu" })).toBeVisible();
  });

  test("mobile keeps its primary navigation available while a drawer is open", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await browse(page, "landmarks");
    await expect(page.getByRole("heading", { name: "Landmarks" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByRole("navigation", { name: "Primary" }),
    ).toBeVisible();
  });

  test("Classes opens class list from the App Menu", async ({ page }) => {
    await browse(page, "classes");
    await expect(
      page.getByRole("heading", { name: "Classes", exact: true }).first(),
    ).toBeVisible({
      timeout: 10_000,
    });
  });

  // Map filters must remain comfortable to tap at 320px.
  test("@desktop-only browse chips keep a 44px touch target on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await gotoHome(page);
    await waitForAppBoot(page);

    const chips = page.locator(".map-filter-chips button");
    await expect(chips.first()).toBeVisible({ timeout: 10_000 });

    const undersized = await chips.evaluateAll((els) =>
      els
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            label: (el.getAttribute("aria-label") || el.textContent || "")
              .trim()
              .slice(0, 24),
            w: Math.round(r.width),
            h: Math.round(r.height),
          };
        })
        .filter((c) => c.w > 0 && c.h > 0 && Math.min(c.w, c.h) < 43.5)
        .map((c) => `${c.label} ${c.w}x${c.h}`),
    );

    expect(undersized, "browse chips below the 44px touch target").toEqual([]);
  });
});
