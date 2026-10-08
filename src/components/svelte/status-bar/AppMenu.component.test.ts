import { fireEvent, render, screen, within } from "@testing-library/svelte";
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

  test("Send feedback opens the feedback panel directly", async () => {
    render(AppMenu, { props: { onSignOut: () => {} } });
    await fireEvent.click(screen.getByRole("button", { name: /app menu/i }));
    await fireEvent.click(
      screen.getByRole("button", { name: /send feedback/i }),
    );
    expect(modalStore.open).toBe(true);
    expect(modalStore.type).toBe("feedback");
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
    expect(screen.getByRole("heading", { name: "Community" })).toBeVisible();

    await fireEvent.click(
      screen.getByRole("button", { name: "Course planner" }),
    );
    expect(sidebarStore.panelOpen).toBe("planner");
  });

  test("leaves out the screens its host already shows as tabs", async () => {
    render(AppMenu, {
      props: { onSignOut: () => {}, hostTabs: ["map", "planner", "today"] },
    });
    await fireEvent.click(screen.getByRole("button", { name: /app menu/i }));

    const panel = screen.getByRole("dialog", { name: "App menu" });
    expect(
      within(panel).queryByRole("button", { name: /^(campus )?map$/i }),
    ).toBeNull();
    expect(
      within(panel).queryByRole("button", { name: "Course planner" }),
    ).toBeNull();
    expect(within(panel).queryByRole("button", { name: "Today" })).toBeNull();
    expect(
      within(panel).getByRole("button", { name: "Final exams" }),
    ).toBeVisible();
  });

  test("marks the current screen", async () => {
    sidebarStore.changeOpened("finals");
    render(AppMenu, { props: { onSignOut: () => {} } });
    await fireEvent.click(screen.getByRole("button", { name: /app menu/i }));

    expect(screen.getByRole("button", { name: "Final exams" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("button", { name: "Academic calendar" }),
    ).not.toHaveAttribute("aria-current");
  });

  test("keeps the sidebar-only browse categories reachable", async () => {
    render(AppMenu, { props: { onSignOut: () => {} } });
    await fireEvent.click(screen.getByRole("button", { name: /app menu/i }));

    await fireEvent.click(screen.getByRole("button", { name: "Colleges" }));
    expect(sidePanelStore.state?.type).toBe("browsing-entities");
  });

  test("community actions are rows, with no duplicate sign-in, FAQ or version link", async () => {
    adminAuthStore.isLoggedIn = false;
    adminAuthStore.username = null;
    render(AppMenu, { props: { onSignOut: () => {} } });
    await fireEvent.click(screen.getByRole("button", { name: /app menu/i }));
    const panel = screen.getByRole("dialog", { name: "App menu" });

    expect(panel.querySelector("details")).toBeNull();
    expect(
      within(panel).getByRole("button", { name: "Leaderboard" }),
    ).toBeVisible();
    expect(
      within(panel).getAllByRole("button", { name: /sign in/i }),
    ).toHaveLength(1);
    expect(within(panel).queryByText(/sign up to contribute/i)).toBeNull();
    expect(within(panel).getAllByRole("link", { name: /faq/i })).toHaveLength(
      1,
    );
    expect(panel.querySelector('a[href="/changelog"]')).toBeNull();
  });
});

describe("AppMenu account row", () => {
  beforeEach(() => {
    adminAuthStore.isLoggedIn = false;
    adminAuthStore.username = null;
    adminAuthStore.canPublish = false;
    adminAuthStore.canReview = false;
    adminAuthStore.role = null;
  });

  test("signed out: one full-width 'Sign in' row opens the sign-in dialog", async () => {
    render(AppMenu, { props: { onSignOut: () => {} } });
    await fireEvent.click(screen.getByRole("button", { name: /app menu/i }));

    const signIn = screen.getByRole("button", { name: "Sign in" });
    expect(signIn).toHaveClass("app-menu__nav-action");
    await fireEvent.click(signIn);
    expect(adminAuthStore.loginOpen).toBe(true);
    adminAuthStore.closeLogin();
  });

  test("a signed-in contributor gets session controls instead of sign in", async () => {
    adminAuthStore.isLoggedIn = true;
    adminAuthStore.username = "juan";
    adminAuthStore.role = "contributor";
    render(AppMenu, { props: { onSignOut: () => {} } });
    await fireEvent.click(screen.getByRole("button", { name: /app menu/i }));

    expect(screen.queryByRole("button", { name: "Sign in" })).toBeNull();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeVisible();
    adminAuthStore.isLoggedIn = false;
    adminAuthStore.username = null;
  });
});

describe("AppMenu appearance row", () => {
  test("the theme switch sits above every destination and repaints immediately", async () => {
    localStorage.removeItem("room-tba:theme");
    render(AppMenu, { props: { onSignOut: () => {} } });

    await fireEvent.click(screen.getByRole("button", { name: /app menu/i }));

    const group = screen.getByRole("group", { name: "Appearance" });
    const panel = screen.getByRole("dialog", { name: "App menu" });
    const firstNav = within(panel).getByRole("button", { name: "Saved" });
    expect(
      group.compareDocumentPosition(firstNav) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    await fireEvent.click(within(group).getByRole("button", { name: "Dark" }));
    expect(document.documentElement.dataset["theme"]).toBe("dark");
    expect(localStorage.getItem("room-tba:theme")).toBe("dark");
    expect(within(group).getByRole("button", { name: "Dark" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await fireEvent.click(
      within(group).getByRole("button", { name: "System" }),
    );
    expect(localStorage.getItem("room-tba:theme")).toBeNull();
  });
});
