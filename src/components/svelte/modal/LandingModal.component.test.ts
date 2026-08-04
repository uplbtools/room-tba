import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { modalStore } from "@lib/store.svelte";

vi.mock("@lib/github-contributors", () => ({
  fetchGithubContributors: vi.fn().mockResolvedValue([]),
}));

vi.mock("@lib/github-stars", () => ({
  fetchGithubStarCountCached: vi.fn().mockResolvedValue(0),
}));

import LandingModal from "./LandingModal.svelte";

/** Cards kept on phones; the rest are hidden below 36rem (see the guide CSS). */
const PRIMARY_FEATURES = [
  "Search rooms",
  "Explore the map",
  "Plan classes",
  "Events",
];

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(new Response(JSON.stringify([])))),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  modalStore.closeModal();
  localStorage.clear();
});

describe("landing modal content balance", () => {
  test("header keeps one value proposition", () => {
    render(LandingModal);
    expect(
      screen.getByText(
        "Find rooms, explore the map, and discover campus events at UPLB.",
      ),
    ).toBeVisible();
    // The other two pitches duplicate the "Browse freely" / "Offline-friendly"
    // cards, so the header must not repeat them.
    expect(screen.queryByText(/No account needed/i)).toBeNull();
    expect(screen.queryByText(/Works offline/i)).toBeNull();
  });

  test("only four feature cards stay on phones", () => {
    render(LandingModal);
    const cards = [...document.querySelectorAll(".feature-card")];
    const phoneCards = cards.filter(
      (card) => !card.classList.contains("feature-card--secondary"),
    );
    expect(phoneCards.map((card) => card.textContent?.trim())).toHaveLength(4);
    for (const [index, label] of PRIMARY_FEATURES.entries()) {
      expect(phoneCards[index]?.textContent).toContain(label);
    }
    // Desktop still shows the full set.
    expect(cards.length).toBeGreaterThan(phoneCards.length);
  });

  test("secondary cards carry the claims dropped from the header", () => {
    render(LandingModal);
    const secondary = [
      ...document.querySelectorAll(".feature-card--secondary"),
    ].map((card) => card.textContent ?? "");
    expect(secondary.join(" ")).toContain("Browse freely");
    expect(secondary.join(" ")).toContain("Offline-friendly");
  });
});

describe("landing modal controls", () => {
  test("tab bar still switches panels", async () => {
    render(LandingModal);
    expect(screen.getByRole("tabpanel")).toHaveAttribute(
      "id",
      "landing-panel-welcome",
    );

    await fireEvent.click(screen.getByRole("tab", { name: "Campus team" }));
    expect(screen.getByRole("tabpanel")).toHaveAttribute(
      "id",
      "landing-panel-campus",
    );
    expect(screen.getByRole("tab", { name: "Campus team" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await fireEvent.click(screen.getByRole("tab", { name: "Welcome" }));
    expect(screen.getByRole("tabpanel")).toHaveAttribute(
      "id",
      "landing-panel-welcome",
    );
  });

  test("Get Started closes the modal", async () => {
    modalStore.openModal("landing");
    render(LandingModal);

    await fireEvent.click(screen.getByRole("button", { name: "Get Started" }));

    expect(modalStore.open).toBe(false);
    expect(localStorage.getItem("hideLandingModal")).toBeNull();
  });

  test("Get Started persists the don't-show-again choice", async () => {
    modalStore.openModal("landing");
    render(LandingModal);

    await fireEvent.click(
      screen.getByRole("checkbox", { name: /Don't show again/i }),
    );
    await fireEvent.click(screen.getByRole("button", { name: "Get Started" }));

    expect(localStorage.getItem("hideLandingModal")).toBe("true");
    expect(modalStore.open).toBe(false);
  });
});
