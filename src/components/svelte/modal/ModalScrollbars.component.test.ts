import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, describe, expect, test, vi } from "vitest";
import { modalStore } from "@lib/store.svelte";

vi.mock("@lib/github-contributors", () => ({
  fetchGithubContributors: vi.fn().mockResolvedValue([]),
}));

vi.mock("@lib/github-stars", () => ({
  fetchGithubStarCountCached: vi.fn().mockResolvedValue(0),
}));

import LandingModal from "./LandingModal.svelte";
import ScheduleModal from "./ScheduleModal.svelte";

afterEach(() => {
  modalStore.closeModal();
});

describe("modal scroll chrome", () => {
  test("landing modal content uses shared scroll chrome", () => {
    render(LandingModal);
    expect(document.querySelector(".scroll-region")).toHaveClass(
      "map-chrome-scroll",
    );
  });

  test("opens Campus team when callers request the campus landing tab", async () => {
    modalStore.closeModal();
    render(LandingModal);

    modalStore.openModal("landing", { landingTab: "campus" });
    await tick();

    expect(screen.getByRole("tab", { name: "Campus team" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tabpanel")).toHaveAttribute(
      "id",
      "landing-panel-campus",
    );
  });

  test("campus team credits inspiration tools with their authors", async () => {
    render(LandingModal);
    await fireEvent.click(screen.getByRole("tab", { name: "Campus team" }));
    expect(screen.getByRole("heading", { name: /inspiration/i })).toBeVisible();
    expect(screen.getByRole("link", { name: "Upsked.com" })).toHaveAttribute(
      "href",
      "https://upsked.com/",
    );
    expect(screen.getByText(/John Paul Poliquit/)).toBeVisible();
    expect(screen.getByRole("link", { name: "UPLB Trail" })).toHaveAttribute(
      "href",
      "https://uplb-trail.vercel.app/",
    );
    expect(screen.getByText(/Bernard Jezua Tandang/)).toBeVisible();
    expect(screen.getByRole("link", { name: "AMISSU" })).toHaveAttribute(
      "href",
      "https://chromewebstore.google.com/detail/amissu/mkdgckblaojfigmbnknehcmnjpkcehcj",
    );
    expect(screen.getByText(/Garth Hendrich Lapitan/)).toBeVisible();
  });

  test("schedule modal body uses shared scroll chrome", () => {
    render(ScheduleModal);
    expect(document.querySelector(".schedule-modal__body")).toHaveClass(
      "map-chrome-scroll",
    );
  });
});
