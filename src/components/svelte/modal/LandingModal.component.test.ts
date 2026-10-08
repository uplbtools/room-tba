import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  directionsStore,
  editorChromeStore,
  modalStore,
  queryStore,
  sidebarStore,
} from "@lib/store.svelte";

const focusSearch = vi.hoisted(() => vi.fn());
vi.mock("@lib/search-focus", () => ({
  focusSearch,
  registerSearchFocus: () => () => {},
}));

import LandingModal from "./LandingModal.svelte";
import Modal from "./Modal.svelte";

beforeEach(() => {
  localStorage.clear();
  focusSearch.mockClear();
  sidebarStore.changeOpened("map");
});

afterEach(() => {
  modalStore.closeModal();
  localStorage.clear();
});

function openFromMenu() {
  modalStore.openModal("landing", { landingTab: "welcome" });
  render(LandingModal);
}

describe("How Room TBA works", () => {
  test("titled for what it is, with one short intro and no hero", () => {
    openFromMenu();
    expect(
      screen.getByRole("heading", { name: "How Room TBA works" }),
    ).toBeVisible();
    expect(screen.getAllByText(/No account needed/)).toHaveLength(1);
    expect(document.querySelector(".hero-image")).toBeNull();
  });

  test("lists current features as rows, students first", () => {
    openFromMenu();
    const labels = [
      ...document.querySelectorAll(
        "#landing-panel-welcome .settings-row__label",
      ),
    ].map((el) => el.textContent?.trim());
    expect(labels.slice(0, 2)).toEqual([
      "Search rooms and buildings",
      "Get directions",
    ]);
    for (const label of [
      "Plan your classes",
      "Saved places",
      "Campus events",
      "Offline maps",
      "Dark mode",
    ]) {
      expect(labels).toContain(label);
    }
  });

  test("has no visitor counter, GitHub stars or interpunct", () => {
    openFromMenu();
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/visitors?|stars? on github/i);
    expect(text).not.toContain("·");
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute(
      "href",
      "/privacy",
    );
    expect(screen.getByRole("link", { name: "Help & FAQ" })).toHaveAttribute(
      "href",
      "/faq",
    );
  });

  test("opened from the menu: no Got it footer, no Done", () => {
    openFromMenu();
    expect(
      screen.queryByRole("button", { name: /got it|get started/i }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Done" })).toBeNull();
  });

  test("first run: Done in the bar closes it", async () => {
    modalStore.openModal("landing");
    render(LandingModal);
    await fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(modalStore.open).toBe(false);
    expect(localStorage.getItem("hideLandingModal")).toBeNull();
  });
});

describe("feature rows do what they say and close the guide", () => {
  test("Search rooms focuses search", async () => {
    openFromMenu();
    await fireEvent.click(
      screen.getByRole("button", { name: "Search rooms and buildings" }),
    );
    expect(focusSearch).toHaveBeenCalledTimes(1);
    expect(modalStore.open).toBe(false);
  });

  test("Get directions opens directions", async () => {
    const openEmpty = vi.spyOn(directionsStore, "openEmpty");
    openFromMenu();
    await fireEvent.click(
      screen.getByRole("button", { name: "Get directions" }),
    );
    expect(openEmpty).toHaveBeenCalledTimes(1);
    expect(modalStore.open).toBe(false);
    openEmpty.mockRestore();
  });

  test("Jeepney routes opens the transit list", async () => {
    openFromMenu();
    await fireEvent.click(
      screen.getByRole("button", { name: "Jeepney and bus routes" }),
    );
    expect(queryStore.category).toBe("browse");
    expect(queryStore.queryValue).toBe("jeepney");
    expect(modalStore.open).toBe(false);
    queryStore.clearQuery();
  });

  test("Plan your classes opens the Planner", async () => {
    openFromMenu();
    await fireEvent.click(
      screen.getByRole("button", { name: "Plan your classes" }),
    );
    expect(sidebarStore.panelOpen).toBe("planner");
    expect(modalStore.open).toBe(false);
  });

  test("Campus events opens the events list", async () => {
    openFromMenu();
    await fireEvent.click(
      screen.getByRole("button", { name: "Campus events" }),
    );
    expect(queryStore.category).toBe("events");
    expect(modalStore.open).toBe(false);
    queryStore.clearQuery();
  });

  test.each([
    ["Saved places", "saved-places"],
    ["Offline maps", "offline-maps"],
    ["Dark mode", "settings"],
  ] as const)("%s opens %s", async (label, type) => {
    openFromMenu();
    await fireEvent.click(screen.getByRole("button", { name: label }));
    expect(modalStore.open).toBe(true);
    expect(modalStore.type).toBe(type);
  });

  test("Suggest an edit opens the add flow", async () => {
    openFromMenu();
    await fireEvent.click(
      screen.getByRole("button", { name: "Suggest an edit" }),
    );
    expect(editorChromeStore.additionModalOpen).toBe(true);
    expect(modalStore.open).toBe(false);
    editorChromeStore.closeAdditionModal();
  });
});

describe("landing modal shell", () => {
  test("the X in the top app bar closes it", async () => {
    modalStore.openModal("landing", { landingTab: "welcome" });
    render(Modal);
    await fireEvent.click(
      await screen.findByRole("button", { name: "Close about Room TBA" }),
    );
    expect(modalStore.open).toBe(false);
  });

  test("opens with focus on the dialog, not a row outline", async () => {
    modalStore.openModal("landing");
    render(Modal);
    const dialog = await screen.findByRole("dialog");
    await vi.waitFor(() => expect(document.activeElement).toBe(dialog));
    expect(dialog.getAttribute("tabindex")).toBe("-1");
  });
});
