import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, test } from "vitest";
import AdminLoginModal from "@ui/AdminLoginModal.svelte";
import { adminAuthStore } from "@lib/store.svelte";
import {
  expectNoHorizontalOverflow,
  mountAtWidth,
} from "@test/layout-assertions";

describe("AdminLoginModal", () => {
  beforeEach(() => {
    adminAuthStore.openLogin();
  });

  test("login frame fits 320px viewport without horizontal scroll", () => {
    mountAtWidth(320);
    render(AdminLoginModal);
    const frame = document.querySelector(".login-frame") as HTMLElement;
    expect(frame).toBeTruthy();
    expectNoHorizontalOverflow(frame);
    expect(screen.getByLabelText("Username or email")).toBeVisible();
    expect(screen.getByLabelText("Password")).toBeVisible();
    expect(
      screen.getByRole("link", { name: /Message maintainers/i }),
    ).toHaveAttribute("href", "https://m.me/j/AbZtqMU8UUTiwQfn/");
  });

  test('the "Sign up" toggle reveals the contributor signup form', async () => {
    render(AdminLoginModal);
    // Sign-in mode: no confirm-password field yet.
    expect(screen.queryByLabelText("Confirm password")).toBeNull();

    await fireEvent.click(screen.getByRole("button", { name: /^Sign up$/i }));

    expect(screen.getByLabelText("Username")).toBeVisible();
    expect(screen.getByLabelText("Confirm password")).toBeVisible();
    expect(screen.getByLabelText("Email (optional)")).toBeVisible();
    expect(
      screen.getByRole("button", { name: /Create account/i }),
    ).toBeVisible();

    // And back again.
    await fireEvent.click(screen.getByRole("button", { name: /^Sign in$/i }));
    expect(screen.queryByLabelText("Confirm password")).toBeNull();
  });
});
