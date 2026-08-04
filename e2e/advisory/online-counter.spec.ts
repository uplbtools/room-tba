import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";

/**
 * The counter used to invent a number (random 20-150, random-walked). These
 * specs pin it to the API: whatever /api/presence returns is what shows, and a
 * failing request shows "--" rather than a plausible-looking lie.
 */
test.describe("online counter @advisory", () => {
  test("renders the count /api/presence returns", async ({ page }) => {
    await page.route("**/api/presence", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ online: 42 }),
      }),
    );

    await page.goto("/");
    await waitForAppBoot(page);

    const counter = page.locator(".online-counter").first();
    await expect(counter).toBeVisible({ timeout: 10_000 });
    await expect(counter).toContainText("42 online", { timeout: 10_000 });
  });

  test("posts an anonymous sid and nothing else", async ({ page }) => {
    const bodies: string[] = [];
    await page.route("**/api/presence", (route) => {
      bodies.push(route.request().postData() ?? "");
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ online: 5 }),
      });
    });

    await page.goto("/");
    await waitForAppBoot(page);
    await expect(page.locator(".online-counter").first()).toContainText(
      "5 online",
      { timeout: 10_000 },
    );

    expect(bodies.length).toBeGreaterThan(0);
    const payload = JSON.parse(bodies[0]!);
    expect(Object.keys(payload)).toEqual(["sid"]);
    expect(payload.sid).toMatch(/^[a-zA-Z0-9-]{8,64}$/);
  });

  test("shows -- instead of a made-up number when the API fails", async ({
    page,
  }) => {
    await page.route("**/api/presence", (route) => route.abort());

    await page.goto("/");
    await waitForAppBoot(page);

    const counter = page.locator(".online-counter").first();
    await expect(counter).toBeVisible({ timeout: 10_000 });
    await expect(counter).toContainText("--", { timeout: 10_000 });
    await expect(counter).not.toContainText(/\d+ online/);
  });
});
