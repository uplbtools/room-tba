import { expect, type Locator, type Page } from "@playwright/test";

const DRAG_DELTA_PX = 120;
const DRAG_STEPS = 16;

type MapEditEntity = "building" | "dorm";

const EDIT_ENTITY_BUTTON: Record<MapEditEntity, RegExp> = {
  building: /^Edit building$/i,
  dorm: /^Edit dorm$/i,
};

function entityMarker(page: Page, entityLabel: string): Locator {
  return page
    .locator(".maplibregl-marker")
    .filter({ has: page.locator(`[aria-label="${entityLabel}"]`) });
}

/** Collapse the entity details sheet so map pins are visible for drag. */
async function revealMapForPinDrag(page: Page) {
  const collapse = page.getByRole("button", {
    name: /collapse details panel/i,
  });
  if (await collapse.isVisible({ timeout: 3000 }).catch(() => false)) {
    if ((await collapse.getAttribute("aria-expanded")) === "true") {
      await collapse.click();
    }
  }
}

async function openEntityMapEditControls(page: Page, entity: MapEditEntity) {
  const enableInPanel = page.getByRole("button", {
    name: /^Enable map edit$/i,
  });
  if (await enableInPanel.isVisible({ timeout: 1500 }).catch(() => false)) {
    return enableInPanel;
  }

  const editEntity = page.getByRole("button", {
    name: EDIT_ENTITY_BUTTON[entity],
  });
  if (await editEntity.isVisible({ timeout: 5000 }).catch(() => false)) {
    await editEntity.click();
  }

  await expect(enableInPanel).toBeVisible({ timeout: 10_000 });
  return enableInPanel;
}

/** Enable map edit from the entity panel or editor shelf. */
export async function enableMapEdit(
  page: Page,
  entity: MapEditEntity = "building",
) {
  const enableInPanel = await openEntityMapEditControls(page, entity).catch(
    () => null,
  );
  if (enableInPanel) {
    await enableInPanel.click();
  } else {
    const turnOn = page.getByRole("button", { name: /turn on map edit/i });
    if (await turnOn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await turnOn.click();
    } else {
      const editorTools = page.getByRole("button", {
        name: /open editor tools/i,
      });
      await editorTools.click({ timeout: 10_000 });
      await turnOn.click({ timeout: 10_000 });
    }
  }

  await expect(page.getByText("Editing map")).toBeVisible({ timeout: 10_000 });
}

/** Wait until an entity pin is on the map (bootstrap + sync). */
export async function waitForEntityPin(page: Page, entityLabel: string) {
  await expect(page.locator(`[aria-label="${entityLabel}"]`)).toBeAttached({
    timeout: 60_000,
  });
}

async function dragMarkerLocator(page: Page, marker: Locator) {
  await marker.waitFor({ state: "attached", timeout: 20_000 });
  await marker.scrollIntoViewIfNeeded();
  const box = await marker.boundingBox();
  if (!box || box.width < 1 || box.height < 1) return false;

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  const endX = startX + DRAG_DELTA_PX;
  const endY = startY + DRAG_DELTA_PX * 0.65;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: DRAG_STEPS });
  await page.mouse.up();
  return true;
}

/**
 * Drag a building/dorm pin by accessible label; returns whether PATCH 200 was observed.
 */
export async function dragEntityMapMarker(
  page: Page,
  entityLabel: string,
  patchUrlPart: string,
): Promise<boolean> {
  await revealMapForPinDrag(page);

  const patchPromise = page
    .waitForResponse(
      (res) =>
        res.request().method() === "PATCH" &&
        res.url().includes(patchUrlPart) &&
        res.status() === 200,
      { timeout: 30_000 },
    )
    .then(() => true)
    .catch(() => false);

  const marker = entityMarker(page, entityLabel);
  await expect(marker).toBeVisible({ timeout: 20_000 });
  const dragged = await dragMarkerLocator(page, marker);
  if (!dragged) return false;
  return patchPromise;
}

/** Assert pin drag persisted; fails the test instead of skipping. */
export async function expectPinDragSave(
  page: Page,
  entityLabel: string,
  patchUrlPart: string,
) {
  const saved = await dragEntityMapMarker(page, entityLabel, patchUrlPart);
  expect(saved, `Pin drag for ${entityLabel} did not trigger PATCH`).toBe(true);
}
