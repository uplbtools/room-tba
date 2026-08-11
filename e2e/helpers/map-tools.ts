import { expect, type Locator, type Page } from "@playwright/test";

export async function openAppMenu(page: Page): Promise<Locator> {
  const trigger = page.getByRole("button", { name: /app menu/i });
  await page.keyboard.press("Escape");
  await trigger.click({ force: true });
  const menu = page.getByRole("dialog", { name: "App menu" });
  await expect(menu).toBeVisible();
  return menu;
}

export async function openCampusDirectory(
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
    | "services"
    | "events",
) {
  const appMenuLabels = {
    colleges: "Colleges",
    organizations: "Student organizations",
    classes: "Classes",
  } as const;
  const menuLabel = appMenuLabels[directory as keyof typeof appMenuLabels];
  if (menuLabel) {
    const menu = await openAppMenu(page);
    await menu.getByRole("button", { name: menuLabel, exact: true }).click();
    return;
  }

  const filterLabels = {
    buildings: "Class Buildings",
    divisions: "Divisions",
    offices: "Units and offices",
    jeepney: "Jeepney routes",
    landmarks: "Landmark",
    services: "Stores",
    events: "Events",
  } as const;
  const button = page
    .getByRole("toolbar", { name: "Map pin filters" })
    .getByRole("button", {
      name: filterLabels[directory as keyof typeof filterLabels],
      exact: true,
    });
  await button.scrollIntoViewIfNeeded();
  await button.click();
}

/**
 * Open the Settings modal through its live App menu entry. The old path (rail Sidebar >
 * Help & settings > Settings) targets a component that stopped rendering
 * (#930), so specs that used it timed out without touching the feature they
 * covered.
 */
export async function openSettingsModal(page: Page) {
  const menu = await openAppMenu(page);
  await menu.getByRole("button", { name: "Settings", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "Settings" });
  await expect(settings).toBeVisible();
  return settings;
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
