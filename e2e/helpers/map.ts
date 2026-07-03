import { expect, type Locator, type Page } from "@playwright/test";

const DRAG_DELTA_PX = 120;
const DRAG_STEPS = 16;

function entityMarker(page: Page, entityLabel: string): Locator {
  return page
    .locator(".maplibregl-marker")
    .filter({ has: page.getByLabel(entityLabel, { exact: true }) });
}

/** Enable map edit from the entity panel or editor shelf. */
export async function enableMapEdit(page: Page) {
  const enableInPanel = page.getByRole("button", {
    name: /^Enable map edit$/i,
  });
  if (await enableInPanel.isVisible({ timeout: 5000 }).catch(() => false)) {
    await enableInPanel.click();
  } else {
    const turnOn = page.getByRole("button", { name: /turn on map edit/i });
    if (await turnOn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await turnOn.click();
    } else {
      const editorTools = page.getByRole("button", {
        name: /open editor tools/i,
      });
      if (await editorTools.isVisible({ timeout: 3000 }).catch(() => false)) {
        await editorTools.click();
        await turnOn.click({ timeout: 5000 });
      }
    }
  }

  await expect(page.getByText("Editing map")).toBeVisible({ timeout: 10_000 });
}

async function dragMarkerLocator(page: Page, marker: Locator) {
  await marker.waitFor({ state: "visible", timeout: 20_000 });
  await marker.scrollIntoViewIfNeeded();
  const box = await marker.boundingBox();
  if (!box) return false;

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

  const dragged = await dragMarkerLocator(
    page,
    entityMarker(page, entityLabel),
  );
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
