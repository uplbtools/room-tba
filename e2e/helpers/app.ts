import type { Page } from "@playwright/test";

export async function dismissLandingIfPresent(page: Page) {
  const getStarted = page.getByRole("button", { name: "Get Started" });
  if (await getStarted.isVisible({ timeout: 3000 }).catch(() => false)) {
    await getStarted.click();
  }
}

export async function waitForAppBoot(page: Page) {
  await dismissLandingIfPresent(page);
  await page.locator(".campus-browse-chips").waitFor({ state: "visible" });
}
