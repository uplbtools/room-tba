import { test, expect } from "@playwright/test";
import { campusSearchBox, waitForAppBoot } from "../helpers/app";

test.describe("smoke boot", () => {
  test("app loads after dismissing landing", async ({ page }) => {
    page.on("pageerror", (err) => {
      throw err;
    });
    await page.goto("/");
    await waitForAppBoot(page);
    await expect(campusSearchBox(page)).toBeVisible();
  });

  test("viewport meta initial-scale=1", async ({ page }) => {
    await page.goto("/");
    const content = await page
      .locator('meta[name="viewport"]')
      .getAttribute("content");
    expect(content).toContain("initial-scale=1");
  });

  /**
   * #1168: a service-worker shell whose chunks have aged out of skew
   * protection used to sit on the loading card until someone clicked "Clear
   * saved copy and reload". The watchdog now does that once by itself.
   *
   * The watchdog's condition is "a worker controls this page". Playwright
   * cannot intercept fetches a real worker makes, and the e2e build ships the
   * real workbox worker, so the worker is faked at the API level and the
   * chunk is aborted at the network level. That exercises exactly the two
   * branches: reset once, then the card.
   */
  test("boot failure under a controlling worker resets once, then shows the card", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(ServiceWorkerContainer.prototype, "controller", {
        configurable: true,
        get: () => ({ scriptURL: "/fake-sw.js", state: "activated" }),
      });
    });
    await page.route("**/_astro/AppRoot*.js*", (route) => route.abort());

    await page.goto("/");

    // First failure: the once-per-tab flag is set and the page reloads.
    // Evaluating across that reload can hit a torn-down context, which is
    // "not yet", not a failure.
    await expect
      .poll(
        () =>
          page
            .evaluate(() => sessionStorage.getItem("room-tba:boot-auto-reset"))
            .catch(() => null),
        { timeout: 90_000 },
      )
      .toBe("1");

    // Second failure in the same tab: no more reloads, the card appears.
    await expect(page.locator("#app-boot-error")).toBeVisible({
      timeout: 90_000,
    });
  });

  test("with no worker to clear, a failed boot shows the card", async ({
    page,
  }) => {
    await page.route("**/_astro/AppRoot*.js*", (route) => route.abort());
    await page.goto("/");
    await expect(page.locator("#app-boot-error")).toBeVisible({
      timeout: 90_000,
    });
  });
});
