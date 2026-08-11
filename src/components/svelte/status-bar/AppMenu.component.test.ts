import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, test } from "vitest";
import AppMenu from "./AppMenu.svelte";
import {
  adminAuthStore,
  modalStore,
  proposalsStore,
  sidebarStore,
  sidePanelStore,
} from "@lib/store.svelte";

describe("AppMenu review entry", () => {
  beforeEach(() => {
    modalStore.closeModal();
    adminAuthStore.canReview = false;
    proposalsStore.pendingCount = 0;
  });

  test("reviewers get a review entry that opens the review modal with the pending count", async () => {
    adminAuthStore.canReview = true;
    proposalsStore.pendingCount = 3;
    render(AppMenu, { props: { onSignOut: () => {} } });

    await fireEvent.click(screen.getByRole("button", { name: /app menu/i }));

    const reviewBtn = screen.getByRole("button", {
      name: /review suggested edits/i,
    });
    expect(reviewBtn).toBeVisible();
    expect(reviewBtn.textContent).toContain("3");

    await fireEvent.click(reviewBtn);
    expect(modalStore.open).toBe(true);
    expect(modalStore.type).toBe("review");
  });

  test("non-reviewers do not see the review entry", async () => {
    adminAuthStore.canReview = false;
    render(AppMenu, { props: { onSignOut: () => {} } });

    await fireEvent.click(screen.getByRole("button", { name: /app menu/i }));

    expect(
      screen.queryByRole("button", { name: /review suggested edits/i }),
    ).toBeNull();
  });
});

describe("AppMenu help entry", () => {
  beforeEach(() => {
    modalStore.closeModal();
    adminAuthStore.canReview = false;
  });

  test("Help & FAQ links to the student FAQ page", async () => {
    render(AppMenu, { props: { onSignOut: () => {} } });
    await fireEvent.click(screen.getByRole("button", { name: /app menu/i }));
    const faq = screen.getByRole("link", { name: /help & faq/i });
    expect(faq).toBeVisible();
    expect(faq).toHaveAttribute("href", "/faq");
  });

  test("'How Room TBA works' opens the landing modal on the welcome tab", async () => {
    render(AppMenu, { props: { onSignOut: () => {} } });
    await fireEvent.click(screen.getByRole("button", { name: /app menu/i }));
    await fireEvent.click(
      screen.getByRole("button", { name: /how room tba works/i }),
    );
    expect(modalStore.open).toBe(true);
    expect(modalStore.type).toBe("landing");
    expect(modalStore.landingTab).toBe("welcome");
  });

  test("opens emergency hotlines", async () => {
    render(AppMenu, { props: { onSignOut: () => {} } });
    await fireEvent.click(screen.getByRole("button", { name: /app menu/i }));
    await fireEvent.click(
      screen.getByRole("button", { name: /emergency hotlines/i }),
    );
    expect(modalStore.type).toBe("hotlines");
  });
});

describe("AppMenu navigation", () => {
  beforeEach(() => {
    modalStore.closeModal();
    sidebarStore.changeOpened("map");
    sidePanelStore.closePanel();
  });

  test("prioritizes app destinations and keeps community links secondary", async () => {
    render(AppMenu, { props: { onSignOut: () => {} } });
    await fireEvent.click(screen.getByRole("button", { name: /app menu/i }));

    expect(screen.getByRole("heading", { name: "Go to" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Course planner" }),
    ).toBeVisible();
    expect(screen.getByText("Community & project links")).toBeVisible();

    await fireEvent.click(
      screen.getByRole("button", { name: "Course planner" }),
    );
    expect(sidebarStore.panelOpen).toBe("planner");
  });

  test("keeps the sidebar-only browse categories reachable", async () => {
    render(AppMenu, { props: { onSignOut: () => {} } });
    await fireEvent.click(screen.getByRole("button", { name: /app menu/i }));

    await fireEvent.click(screen.getByRole("button", { name: "Colleges" }));
    expect(sidePanelStore.state?.type).toBe("browsing-entities");
  });
});
