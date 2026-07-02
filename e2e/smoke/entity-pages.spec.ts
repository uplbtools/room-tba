import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import {
  buildingPagePath,
  eventPagePath,
  roomPagePath,
} from "../helpers/search";
import { E2E_FIXTURES } from "../../scripts/e2e-reset-db";

test.describe("entity pages", () => {
  test("seeded building page 200", async ({ page }) => {
    const res = await page.goto(buildingPagePath());
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator("body")).toContainText(E2E_FIXTURES.buildingName);
  });

  test("seeded room page 200", async ({ page }) => {
    const res = await page.goto(roomPagePath());
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator("body")).toContainText(E2E_FIXTURES.roomCode);
  });

  test("seeded event page 200", async ({ page }) => {
    const res = await page.goto(eventPagePath());
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator("body")).toContainText(E2E_FIXTURES.eventTitle);
  });

  test("sitemap returns 200", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
  });
});

test.describe("landing", () => {
  test("Get Started dismisses modal", async ({ page }) => {
    await page.goto("/");
    const getStarted = page.getByRole("button", { name: "Get Started" });
    if (await getStarted.isVisible({ timeout: 3000 }).catch(() => false)) {
      await getStarted.click();
    }
    await expect(page.locator(".campus-browse-chips")).toBeVisible();
  });

  test("don't show again persists", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("hideLandingModal"));
    await page.reload();
    const getStarted = page.getByRole("button", { name: "Get Started" });
    if (await getStarted.isVisible({ timeout: 5000 }).catch(() => false)) {
      await page.getByLabel(/don't show/i).check();
      await getStarted.click();
      await page.reload();
      await waitForAppBoot(page);
      await expect(getStarted).not.toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe("bootstrap", () => {
  test("map canvas loads after boot", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await expect(page.locator(".maplibregl-canvas")).toBeVisible({
      timeout: 20_000,
    });
  });
});
