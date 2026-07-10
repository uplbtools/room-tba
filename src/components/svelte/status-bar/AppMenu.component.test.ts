import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, test } from "vitest";
import AppMenu from "./AppMenu.svelte";
import { modalStore, proposalsStore } from "@lib/store.svelte";
import { adminAuthStore } from "@lib/stores/admin-auth.svelte";

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
});
