import type { Page } from "@playwright/test";
import { E2E_FIXTURES } from "../../scripts/e2e-reset-db";

export async function searchAndSelect(
  page: Page,
  query: string,
  optionPattern: RegExp,
) {
  await page.getByPlaceholder("Search campus").fill(query);
  await page.getByRole("option", { name: optionPattern }).first().click({
    timeout: 15_000,
  });
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

export function buildingPagePath(id = 1) {
  return `/building/e2e-test-hall-${id}/`;
}

export function roomPagePath(id = 1) {
  return `/room/e2e-101-${id}/`;
}

export function eventPagePath() {
  return `/event/${E2E_FIXTURES.eventSlug}/`;
}
