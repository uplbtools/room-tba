import type { Page } from "@playwright/test";

/** Drag the first MapLibre marker; returns whether a PATCH request was observed. */
export async function dragFirstMapMarker(
  page: Page,
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

  const marker = page.locator(".maplibregl-marker").first();
  await marker.waitFor({ state: "visible", timeout: 15_000 }).catch(() => {});
  const box = await marker.boundingBox();
  if (!box) return false;

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2);
  await page.mouse.up();

  return patchPromise;
}

export async function enableMapEdit(page: Page) {
  const editToggle = page.getByRole("button", {
    name: /map edit|edit map|turn on map edit/i,
  });
  if (await editToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
    await editToggle.click();
  }
}
