import { render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { modalStore } from "@lib/store.svelte";

vi.mock("@lib/github-contributors", () => ({
  fetchGithubContributors: vi.fn().mockResolvedValue([]),
}));

import ContributorsModal from "./ContributorsModal.svelte";
import LandingModal from "./LandingModal.svelte";
import ScheduleModal from "./ScheduleModal.svelte";

afterEach(() => {
  modalStore.closeModal();
});

describe("modal scroll chrome", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        if (String(input) === "/api/editor-credits") {
          return Promise.resolve(
            new Response(
              JSON.stringify([
                {
                  name: "Live Editor",
                  avatarUrl: "https://example.com/avatar.png",
                  profileUrl: "https://example.com/profile",
                },
              ]),
            ),
          );
        }
        return Promise.resolve(new Response(JSON.stringify([])));
      }),
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  test("landing modal content uses shared scroll chrome", () => {
    render(LandingModal);
    expect(document.querySelector(".landing__scroll")).toHaveClass(
      "map-chrome-scroll",
    );
  });

  test("contributors is its own screen, not a tab of the guide", async () => {
    render(ContributorsModal);
    await tick();
    expect(
      screen.getByRole("heading", { name: "Contributors" }),
    ).toBeVisible();
    expect(document.querySelector(".contributors__scroll")).toHaveClass(
      "map-chrome-scroll",
    );
    expect(document.getElementById("landing-panel-welcome")).toBeNull();
  });

  test("contributors credits inspiration tools with their authors", async () => {
    render(ContributorsModal);
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

  test("contributors renders live editor credits with optional profile links", async () => {
    render(ContributorsModal);
    const name = await screen.findByText("Live Editor");
    expect(name.closest("a")).toHaveAttribute(
      "href",
      "https://example.com/profile",
    );
    expect(screen.getByAltText("Live Editor")).toHaveAttribute(
      "src",
      "https://example.com/avatar.png",
    );
  });

  test("schedule modal body uses shared scroll chrome", () => {
    render(ScheduleModal);
    expect(document.querySelector(".schedule-modal__body")).toHaveClass(
      "map-chrome-scroll",
    );
  });
});
