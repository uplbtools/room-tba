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
   * saved copy and reload". The watchdog now does that once by itself. The
   * worker here is a stub served by the test (no fetch handler), enough to
   * make the page "controlled", which is the condition the watchdog checks.
   */
  test("a controlled page whose app chunk 404s resets itself once, then shows the card", async ({
    page,
  }) => {
    await page.route("**/e2e-stub-sw.js", (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: "self.addEventListener('install', () => self.skipWaiting()); self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));",
      }),
    );
    await page.goto("/");
    await waitForAppBoot(page);
    await page.evaluate(async () => {
      await navigator.serviceWorker.register("/e2e-stub-sw.js");
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    expect(
      await page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    ).toBe(true);

    // From here the app island can never hydrate.
    await page.route("**/_astro/AppRoot*.js*", (route) => route.abort());

    await page.goto("/");
    // First failure: automatic reset. The reload lands with no worker and the
    // once-per-tab flag set.
    await expect
      .poll(
        () =>
          page
            .evaluate(() => sessionStorage.getItem("room-tba:boot-auto-reset"))
            // The reset reloads the page mid-poll; a torn-down context is
            // "not yet", not a failure.
            .catch(() => null),
        { timeout: 60_000 },
      )
      .toBe("1");
    await expect
      .poll(
        () =>
          page
            .evaluate(
              async () =>
                (await navigator.serviceWorker.getRegistrations()).length,
            )
            .catch(() => -1),
        { timeout: 60_000 },
      )
      .toBe(0);

    // Second failure in the same tab: no more reloads, the card appears.
    await expect(page.locator("#app-boot-error")).toBeVisible({
      timeout: 90_000,
    });
  });
});
