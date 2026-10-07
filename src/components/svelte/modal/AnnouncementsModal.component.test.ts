import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, test } from "vitest";
import AnnouncementsModal from "./AnnouncementsModal.svelte";
import { adminAuthStore, announcementsStore } from "@lib/store.svelte";
import type { AnnouncementData } from "@lib/types";

const row = (
  id: number,
  overrides: Partial<AnnouncementData> = {},
): AnnouncementData =>
  ({
    id,
    title: `Notice ${id}`,
    body: `Body ${id}`,
    severity: "info",
    startsOn: "2020-01-01 08:00:00",
    endsOn: null,
    linkUrl: null,
    author: "Room TBA",
    createdAt: "2020-01-01 08:00:00",
    version: 1,
    updatedAt: "2020-01-01 08:00:00",
    ...overrides,
  }) as AnnouncementData;

describe("AnnouncementsModal", () => {
  beforeEach(() => {
    localStorage.clear();
    announcementsStore.hydrate();
    adminAuthStore.canPublish = false;
    announcementsStore.items = [];
  });

  test("lists announcements newest first with a relative date and severity", () => {
    announcementsStore.items = [
      row(2, { title: "Newer", startsOn: "2024-05-02 08:00:00" }),
      row(1, { title: "Older", startsOn: "2024-05-01 08:00:00" }),
    ];
    render(AnnouncementsModal);

    const titles = screen
      .getAllByRole("heading", { level: 3 })
      .map((el) => el.textContent);
    expect(titles).toEqual(["Newer", "Older"]);
    expect(screen.getAllByText(/ago$/).length).toBe(2);
    expect(screen.getAllByText("Info").length).toBe(2);
  });

  test("reading the panel clears the unread badge", () => {
    announcementsStore.items = [row(1)];
    expect(announcementsStore.unread).toBe(1);

    render(AnnouncementsModal);
    expect(announcementsStore.unread).toBe(0);
  });

  test("editor controls stay hidden for readers", () => {
    announcementsStore.items = [row(1)];
    render(AnnouncementsModal);

    expect(screen.queryByRole("button", { name: /new announcement/i })).toBe(
      null,
    );
    expect(screen.queryByRole("button", { name: /^delete$/i })).toBe(null);
  });

  test("empty state instead of a blank panel", () => {
    render(AnnouncementsModal);
    expect(screen.getByText(/no announcements right now/i)).toBeVisible();
    // A next step instead of a dead end, and no detour to release notes.
    expect(
      screen.getByRole("link", { name: /follow on facebook/i }),
    ).toHaveAttribute("href", expect.stringContaining("facebook.com"));
    expect(screen.queryByRole("button", { name: /what's new/i })).toBeNull();
  });
});
