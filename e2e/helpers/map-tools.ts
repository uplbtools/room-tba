import { expect, type Locator, type Page } from "@playwright/test";

/** Ensure the app sidebar rail is open (mobile hides it behind the App menu
 * button) and return its locator for scoping browse-entry clicks.
 *
 * The `retracted` class alone is not the signal: desktop keeps it while the
 * rail stays visible (the hiding CSS is mobile-only), and the App menu button
 * only exists on mobile — waiting for it on desktop hangs. Gate on the button
 * actually being there. */
export async function openAppSidebar(page: Page): Promise<Locator> {
  const sidebar = page.locator("#app-sidebar");
  const appMenu = page.getByRole("button", { name: /app menu/i });
  const retracted = await sidebar
    .evaluate((el) => el.classList.contains("retracted"))
    .catch(() => true);
  if (retracted && (await appMenu.isVisible().catch(() => false))) {
    await appMenu.click();
    await expect(sidebar).not.toHaveClass(/retracted/, { timeout: 10_000 });
  }
  return sidebar;
}

/** Click a sidebar nav button after scrolling the rail so mobile submenu items are reachable. */
export async function clickSidebarNav(
  sidebar: Locator,
  name: string | RegExp,
  options?: { exact?: boolean },
) {
  const button = sidebar.getByRole("button", { name, exact: options?.exact });
  await button.scrollIntoViewIfNeeded();
  await expect(button).toBeVisible();
  await button.click();
}

/** Expand Help & settings and return the sidebar locator for follow-up clicks. */
export async function openHelpSettingsSection(sidebar: Locator) {
  await clickSidebarNav(sidebar, "Help & settings");
  return sidebar;
}

export async function openMapTools(page: Page) {
  const mapMenu = page.getByRole("button", { name: /map menu/i });
  const mapToolsFab = page.getByRole("button", { name: /^Map tools$/i });

  if (await mapMenu.isVisible().catch(() => false)) {
    await mapMenu.click();
  } else {
    await mapToolsFab.click();
  }

  await expect(page.getByRole("dialog", { name: /map tools/i })).toBeVisible({
    timeout: 10_000,
  });
}

export async function expandMapToolsSection(page: Page, section: string) {
  await page
    .getByRole("button", { name: new RegExp(`^${section}$`, "i") })
    .click();
}
