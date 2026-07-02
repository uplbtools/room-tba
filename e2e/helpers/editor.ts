import { expect, type Page } from "@playwright/test";

type EntityKind = "building" | "dorm" | "room" | "event";

const EDITOR_TOGGLE: Record<EntityKind, RegExp> = {
  building: /edit building/i,
  dorm: /edit dorm/i,
  room: /edit room/i,
  event: /edit event/i,
};

export async function openEntityEditor(page: Page, kind: EntityKind) {
  await page.getByRole("button", { name: EDITOR_TOGGLE[kind] }).click();
  await expect(page.locator(".entity-editor")).toBeVisible({ timeout: 10_000 });
}

export async function expandEditorMoreFields(page: Page) {
  const summary = page.locator("details.editor-advanced summary");
  if (await summary.isVisible().catch(() => false)) {
    await summary.click();
  }
}

export async function fillAndSaveEditorField(
  page: Page,
  inputId: string,
  value: string,
) {
  const input = page.locator(`#${inputId}`);
  await input.scrollIntoViewIfNeeded();
  await expect(input).toBeVisible({ timeout: 10_000 });
  await input.fill(value);

  const row = page.locator(".editor-field").filter({ has: input });
  const save = row.getByRole("button", { name: /^save$/i });
  await expect(save).toBeEnabled({ timeout: 5_000 });
  const saveResponse = page.waitForResponse(
    (res) =>
      (res.request().method() === "PATCH" ||
        res.request().method() === "POST") &&
      /\/api\/admin\//.test(res.url()) &&
      res.status() >= 200 &&
      res.status() < 300,
    { timeout: 20_000 },
  );
  await save.click();
  await saveResponse;
  await expect(save).toBeDisabled({ timeout: 10_000 });
}
