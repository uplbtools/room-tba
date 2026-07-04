import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, test } from "vitest";
import EditorShelfHost from "@test/components/EditorShelfHost.svelte";
import { adminAuthStore } from "@lib/store.svelte";
import { mountAtWidth } from "@test/layout-assertions";

describe("EditorShelf", () => {
  beforeEach(() => {
    adminAuthStore.isLoggedIn = true;
    adminAuthStore.username = "e2e-admin";
    adminAuthStore.displayName = "E2E Admin";
    adminAuthStore.role = "admin";
    adminAuthStore.canPublish = true;
    adminAuthStore.canReview = true;
  });

  test("editor shelf renders signed-in controls at 320px", () => {
    mountAtWidth(320);
    render(EditorShelfHost);
    expect(screen.getByRole("button", { name: /sign out/i })).toBeVisible();
    expect(screen.getByText(/signed in as admin/i)).toBeVisible();
    expect(document.querySelector(".editor-shelf-action")).toBeTruthy();
  });
});
