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
   * The e2e build ships the real workbox worker, and Playwright cannot
   * intercept fetches a worker makes, so the failure is staged the way it
   * happens in production: the worker's own precache answers the AppRoot
   * import with a 404.
   */
  test("a controlled page whose app chunk fails resets itself once and recovers", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    // src/pwa.ts registered the worker on this page; wait for it, then reload
    // so the page is controlled, which is the condition the watchdog checks.
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await page.reload();
    await waitForAppBoot(page);
    expect(
      await page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    ).toBe(true);

    const poisoned = await page.evaluate(async () => {
      let count = 0;
      for (const name of await caches.keys()) {
        const cache = await caches.open(name);
        for (const request of await cache.keys()) {
          if (/AppRoot/.test(request.url)) {
            await cache.put(request, new Response("", { status: 404 }));
            count += 1;
          }
        }
      }
      return count;
    });
    expect(poisoned).toBeGreaterThan(0);

    await page.goto("/");

    // The watchdog resets once: flag set, worker gone. Evaluating across the
    // reload it triggers can hit a torn-down context, which is "not yet".
    await expect
      .poll(
        () =>
          page
            .evaluate(() => sessionStorage.getItem("room-tba:boot-auto-reset"))
            .catch(() => null),
        { timeout: 90_000 },
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

    // The reload fetched a fresh shell and chunk from the network.
    await waitForAppBoot(page);
    await expect(campusSearchBox(page)).toBeVisible();
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
