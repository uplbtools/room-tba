import { expect, type Locator, type Page } from "@playwright/test";

export async function openAppMenu(page: Page): Promise<Locator> {
  const trigger = page.getByRole("button", { name: /app menu/i });
  await page.keyboard.press("Escape");
  await trigger.click({ force: true });
  const menu = page.getByRole("dialog", { name: "App menu" });
  await expect(menu).toBeVisible();
  await settleAnimations(menu);
  return menu;
}

/** Wait for the menu's open transition, so boxes and clicks see its resting place. */
export async function settleAnimations(locator: Locator): Promise<void> {
  await locator.evaluate((el) =>
    Promise.all(
      el
        .getAnimations({ subtree: true })
        .map((a) => a.finished.catch(() => {})),
    ),
  );
}

/**
 * Open a destination the way a person would: its Primary tab when the layout
 * has one (the bottom nav on phones, the top bar on desktop), else its App
 * menu row. The menu leaves out what the host's tabs already show.
 */
export async function openDestination(page: Page, name: RegExp): Promise<void> {
  const tab = page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("button", { name });
  if (await tab.count()) {
    await tab.first().click();
    return;
  }
  const menu = await openAppMenu(page);
  await menu.getByRole("button", { name }).click();
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

  const toolbar = page.getByRole("toolbar", { name: "Map pin filters" });
  // The org chart sits behind the row's More chip.
  const moreLabels = {
    divisions: "Divisions",
    offices: "Units and offices",
  } as const;
  const moreLabel = moreLabels[directory as keyof typeof moreLabels];
  if (moreLabel) {
    const more = toolbar.getByRole("button", { name: "More", exact: true });
    await more.scrollIntoViewIfNeeded();
    await more.click();
    await page
      .getByRole("menu", { name: "More categories" })
      .getByRole("menuitem", { name: moreLabel, exact: true })
      .click();
    return;
  }

  const filterLabels = {
    buildings: "Class Buildings",
    jeepney: "Jeepney routes",
    landmarks: "Landmarks",
    services: "Food & stores",
    events: "Events",
  } as const;
  const button = toolbar.getByRole("button", {
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
  const mapToolsFab = page.getByRole("button", { name: /^Layers$/i });

  if (await mapMenu.isVisible().catch(() => false)) {
    await mapMenu.click();
  } else {
    await mapToolsFab.click();
  }

  await expect(page.getByRole("dialog", { name: /^layers$/i })).toBeVisible({
    timeout: 10_000,
  });
}

export async function expandMapToolsSection(page: Page, section: string) {
  await page
    .getByRole("button", { name: new RegExp(`^${section}$`, "i") })
    .click();
}
