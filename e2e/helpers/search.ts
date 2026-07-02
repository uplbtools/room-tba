import type { Locator, Page } from "@playwright/test";
import { E2E_FIXTURES } from "../../scripts/e2e-reset-db";
import { campusSearchBox } from "./app";

export function searchSuggestions(page: Page): Locator {
  return page.getByRole("listbox", { name: /search suggestions/i });
}

export async function searchAndSelect(
  page: Page,
  query: string,
  optionPattern: RegExp,
) {
  await campusSearchBox(page).fill(query);
  const suggestion = searchSuggestions(page)
    .getByRole("button", { name: optionPattern })
    .first();
  await suggestion.waitFor({ state: "visible", timeout: 30_000 });
  await suggestion.click({ timeout: 15_000 });
}

export async function openBuilding(page: Page) {
  await searchAndSelect(
    page,
    E2E_FIXTURES.buildingName,
    new RegExp(E2E_FIXTURES.buildingName, "i"),
  );
}

export async function openRoom(page: Page) {
  await searchAndSelect(
    page,
    E2E_FIXTURES.roomCode,
    new RegExp(E2E_FIXTURES.roomCode, "i"),
  );
}

export async function openDorm(page: Page) {
  await searchAndSelect(
    page,
    E2E_FIXTURES.dormName,
    new RegExp(E2E_FIXTURES.dormName, "i"),
  );
}

export async function openEvent(page: Page) {
  await searchAndSelect(
    page,
    E2E_FIXTURES.eventTitle,
    new RegExp(E2E_FIXTURES.eventTitle, "i"),
  );
}

/** Building entity pages use name slug only (no id suffix). */
export function buildingPagePath() {
  return "/building/e2e-test-hall/";
}

export function roomPagePath(id = 1) {
  return `/room/e2e-101-${id}/`;
}

export function eventPagePath() {
  return `/event/${E2E_FIXTURES.eventSlug}/`;
}
