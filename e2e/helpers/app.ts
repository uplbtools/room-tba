import type { Locator, Page } from "@playwright/test";

export function campusSearchBox(page: Page): Locator {
  return page.getByRole("searchbox", { name: /search campus/i });
}

/** Skip landing modal auto-open for this browser context (call before first goto). */
export async function suppressLandingModal(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("hideLandingModal", "true");
    } catch {
      // ignore private mode / blocked storage
    }
  });
}

export async function dismissLandingIfPresent(page: Page) {
  await page.evaluate(() => {
    try {
      localStorage.setItem("hideLandingModal", "true");
    } catch {
      // ignore
    }
  });

  const getStarted = page.getByRole("button", { name: "Get Started" });
  if (await getStarted.isVisible({ timeout: 5000 }).catch(() => false)) {
    await getStarted.click();
  }

  const closeDialog = page.getByRole("button", { name: "Close dialog" });
  if (await closeDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
    await closeDialog.click();
  }

  const modal = page.locator(".modal-set");
  await modal.waitFor({ state: "hidden", timeout: 15_000 }).catch(() => {});
}

/** Wait until map chrome is interactive (loading shell gone, browse chips clickable). */
export async function waitForAppBoot(page: Page, timeout = 120_000) {
  await dismissLandingIfPresent(page);

  const shell = page.locator("#app-loading-shell");
  if ((await shell.count()) > 0) {
    await shell.waitFor({ state: "detached", timeout });
  }

  await dismissLandingIfPresent(page);

  // The browse chips are gone; the term chip is the always-present signal that
  // the search chrome finished booting.
  const termChip = page.locator(".term-filter-chip").first();
  await termChip.waitFor({ state: "visible", timeout: 30_000 });
  await termChip.click({ trial: true, timeout: 30_000 });
}

export async function gotoHome(page: Page) {
  await suppressLandingModal(page);
  await page.goto("/");
}
