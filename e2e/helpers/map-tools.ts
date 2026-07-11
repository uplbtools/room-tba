import { expect, type Locator, type Page } from "@playwright/test";

/** Ensure the app sidebar rail is open (mobile hides it behind the App menu
 * button) and return its locator for scoping browse-entry clicks. */
export async function openAppSidebar(page: Page): Promise<Locator> {
  const sidebar = page.locator("#app-sidebar");
  const retracted = await sidebar
    .evaluate((el) => el.classList.contains("retracted"))
    .catch(() => true);
  if (retracted) {
    await page.getByRole("button", { name: /app menu/i }).click();
    await expect(sidebar).not.toHaveClass(/retracted/, { timeout: 10_000 });
  }
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
