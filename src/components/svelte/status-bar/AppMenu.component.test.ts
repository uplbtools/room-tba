import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeEach, describe, expect, test, vi } from "vitest";
import AppMenu from "./AppMenu.svelte";
import {
  adminAuthStore,
  modalStore,
  proposalsStore,
  sidebarStore,
  sidePanelStore,
} from "@lib/store.svelte";

vi.mock("@lib/github-contributors", () => ({
  fetchGithubContributors: vi.fn().mockResolvedValue([]),
}));

async function openYou() {
  await fireEvent.click(screen.getByRole("button", { name: "You" }));
  return screen.getByRole("dialog", { name: "You" });
}

describe("You review entry", () => {
  beforeEach(() => {
    modalStore.closeModal();
    adminAuthStore.canReview = false;
    proposalsStore.pendingCount = 0;
  });

  test("reviewers get a review entry that opens the review modal with the pending count", async () => {
    adminAuthStore.canReview = true;
    proposalsStore.pendingCount = 3;
    render(AppMenu, { props: { onSignOut: () => {} } });
    await openYou();

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
    render(AppMenu, { props: { onSignOut: () => {} } });
    await openYou();
    expect(
      screen.queryByRole("button", { name: /review suggested edits/i }),
    ).toBeNull();
  });
});

describe("You help and feedback", () => {
  beforeEach(() => {
    modalStore.closeModal();
    adminAuthStore.canReview = false;
  });

  test("one Help & feedback section holds FAQ, the guide, the wiki and feedback", async () => {
    render(AppMenu, { props: { onSignOut: () => {} } });
    const panel = await openYou();
    const help = within(panel)
      .getByRole("heading", { name: "Help & feedback" })
      .closest("section") as HTMLElement;

    expect(within(help).getByRole("link", { name: "Help & FAQ" })).toHaveAttribute(
      "href",
      "/faq",
    );
    expect(within(help).getByRole("link", { name: "Wiki" })).toHaveAttribute(
      "href",
      "/wiki",
    );
    expect(
      within(help).getByRole("button", { name: "How Room TBA works" }),
    ).toBeVisible();
    expect(within(help).getByRole("button", { name: "Contributors" })).toBeVisible();
    expect(within(help).getByRole("button", { name: "Send feedback" })).toBeVisible();
    expect(
      within(help).getByRole("link", { name: /contact us/i }),
    ).toHaveAttribute("target", "_blank");
    // Send feedback lives in one place.
    expect(
      within(panel).getAllByRole("button", { name: "Send feedback" }),
    ).toHaveLength(1);
  });

  test("'How Room TBA works' opens only the guide", async () => {
    render(AppMenu, { props: { onSignOut: () => {} } });
    await openYou();
    await fireEvent.click(
      screen.getByRole("button", { name: "How Room TBA works" }),
    );
    expect(modalStore.type).toBe("landing");
    expect(modalStore.landingTab).toBe("welcome");
  });

  test("Contributors pushes its own list screen, Back returns", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(JSON.stringify([])))),
    );
    render(AppMenu, { props: { onSignOut: () => {} } });
    const panel = await openYou();
    await fireEvent.click(screen.getByRole("button", { name: "Contributors" }));

    expect(
      within(panel).getByRole("heading", { name: "Contributors" }),
    ).toBeVisible();
    expect(modalStore.open).toBe(false);
    await fireEvent.click(within(panel).getByRole("button", { name: "Back" }));
    await tick();
    expect(within(panel).getByRole("heading", { name: "You" })).toBeVisible();
    vi.unstubAllGlobals();
  });

  test("Send feedback opens the feedback panel directly", async () => {
    render(AppMenu, { props: { onSignOut: () => {} } });
    await openYou();
    await fireEvent.click(screen.getByRole("button", { name: "Send feedback" }));
    expect(modalStore.type).toBe("feedback");
  });

  test("opens emergency hotlines", async () => {
    render(AppMenu, { props: { onSignOut: () => {} } });
    await openYou();
    await fireEvent.click(
      screen.getByRole("button", { name: /emergency hotlines/i }),
    );
    expect(modalStore.type).toBe("hotlines");
  });
});

describe("You screens", () => {
  beforeEach(() => {
    modalStore.closeModal();
    sidebarStore.changeOpened("map");
    sidePanelStore.closePanel();
  });

  test("Settings and Offline maps & storage push inside the sheet", async () => {
    render(AppMenu, { props: { onSignOut: () => {} } });
    const panel = await openYou();

    await fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(within(panel).getByRole("heading", { name: "Settings" })).toBeVisible();
    // Layers owns the map controls; Settings has none of them.
    expect(within(panel).queryByText("Map style")).toBeNull();
    expect(within(panel).queryByText("Basemap")).toBeNull();
    await fireEvent.click(within(panel).getByRole("button", { name: "Back" }));
    await tick();

    await fireEvent.click(
      screen.getByRole("button", { name: "Offline maps & storage" }),
    );
    expect(
      within(panel).getByRole("heading", { name: "Offline maps & storage" }),
    ).toBeVisible();
    expect(within(panel).getByRole("button", { name: "Resync" })).toBeVisible();
    expect(
      within(panel).getByRole("button", { name: "Reset offline data" }),
    ).toBeVisible();
  });

  test("the root has a title and a close button", async () => {
    render(AppMenu, { props: { onSignOut: () => {} } });
    const panel = await openYou();
    expect(within(panel).getByRole("heading", { name: "You" })).toBeVisible();
    await fireEvent.click(within(panel).getByRole("button", { name: "Close" }));
    await tick();
    expect(screen.queryByRole("dialog", { name: "You" })).toBeNull();
  });

  test("leaves out the screens its host already shows as tabs", async () => {
    render(AppMenu, {
      props: { onSignOut: () => {}, hostTabs: ["map", "planner", "today"] },
    });
    const panel = await openYou();
    expect(
      within(panel).queryByRole("button", { name: "Course planner" }),
    ).toBeNull();
    expect(within(panel).queryByRole("button", { name: "Today" })).toBeNull();
    expect(
      within(panel).getByRole("button", { name: "Final exams" }),
    ).toBeVisible();
  });

  test("opens campus screens", async () => {
    render(AppMenu, { props: { onSignOut: () => {} } });
    await openYou();
    await fireEvent.click(
      screen.getByRole("button", { name: "Course planner" }),
    );
    expect(sidebarStore.panelOpen).toBe("planner");
  });

  test("marks the current screen", async () => {
    sidebarStore.changeOpened("finals");
    render(AppMenu, { props: { onSignOut: () => {} } });
    await openYou();
    expect(screen.getByRole("button", { name: "Final exams" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("button", { name: "Academic calendar" }),
    ).not.toHaveAttribute("aria-current");
  });

  test("About lists the version, What's new, Privacy and Terms", async () => {
    render(AppMenu, { props: { onSignOut: () => {} } });
    const panel = await openYou();
    const about = within(panel)
      .getByRole("heading", { name: "About" })
      .closest("section") as HTMLElement;
    expect(within(about).getByText(/^v\d+\.\d+\.\d+/)).toBeVisible();
    expect(within(about).getByRole("button", { name: "What's new" })).toBeVisible();
    expect(within(about).getByRole("link", { name: "Privacy" })).toHaveAttribute(
      "href",
      "/privacy",
    );
    expect(within(about).getByRole("link", { name: "Terms" })).toHaveAttribute(
      "href",
      "/terms",
    );
  });

  test("links the printable transit map", async () => {
    render(AppMenu, { props: { onSignOut: () => {} } });
    await openYou();
    expect(
      screen.getByRole("link", { name: /printable transit map/i }),
    ).toHaveAttribute("href", "/api/transit-map");
  });
});

describe("You account", () => {
  beforeEach(() => {
    adminAuthStore.isLoggedIn = false;
    adminAuthStore.username = null;
    adminAuthStore.canPublish = false;
    adminAuthStore.canReview = false;
    adminAuthStore.role = null;
  });

  test("signed out: one Sign in row opens the sign-in dialog", async () => {
    render(AppMenu, { props: { onSignOut: () => {} } });
    const panel = await openYou();
    const signIn = within(panel).getByRole("button", { name: "Sign in" });
    expect(within(panel).getAllByRole("button", { name: /sign in/i })).toHaveLength(1);
    await fireEvent.click(signIn);
    expect(adminAuthStore.loginOpen).toBe(true);
    adminAuthStore.closeLogin();
  });

  test("signed in: avatar trigger, account row and sign out", async () => {
    adminAuthStore.isLoggedIn = true;
    adminAuthStore.username = "juan";
    adminAuthStore.role = "contributor";
    render(AppMenu, { props: { onSignOut: () => {} } });
    await openYou();

    expect(screen.queryByRole("button", { name: "Sign in" })).toBeNull();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeVisible();
    expect(screen.getAllByRole("img", { name: "juan" }).length).toBeGreaterThan(0);
    adminAuthStore.isLoggedIn = false;
    adminAuthStore.username = null;
  });
});
