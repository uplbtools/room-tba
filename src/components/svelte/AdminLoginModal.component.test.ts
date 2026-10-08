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
    // Editor access is requested in-app now, not over Messenger (#15).
    expect(screen.getByRole("link", { name: /Request it/i })).toHaveAttribute(
      "href",
      "/admin",
    );
  });

  test('the "Sign up" toggle reveals the contributor signup form', async () => {
    render(AdminLoginModal);
    // Sign-in mode: no confirm-password field yet.
    expect(screen.queryByLabelText("Confirm password")).toBeNull();

    await fireEvent.click(screen.getByRole("button", { name: /^Sign up$/i }));

    expect(screen.getByLabelText("Username")).toBeVisible();
    expect(screen.getByLabelText("Confirm password")).toBeVisible();
    expect(
      screen.getByLabelText("Email (needed to reset your password)"),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /Create account/i }),
    ).toBeVisible();

    // And back again.
    await fireEvent.click(screen.getByRole("button", { name: /^Sign in$/i }));
    expect(screen.queryByLabelText("Confirm password")).toBeNull();
  });

  test("starts with an empty username and can reveal the password", async () => {
    render(AdminLoginModal);
    expect(screen.getByRole("dialog", { name: "Sign in" })).toBeVisible();
    expect(screen.getByLabelText("Username or email")).toHaveValue("");

    const password = screen.getByLabelText("Password");
    expect(password).toHaveAttribute("type", "password");
    await fireEvent.click(
      screen.getByRole("button", { name: "Show password" }),
    );
    expect(password).toHaveAttribute("type", "text");
    expect(
      screen.getByRole("button", { name: "Hide password" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
