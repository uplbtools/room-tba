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

  test("forgot password is titled Reset password and explains the dead ends", async () => {
    render(AdminLoginModal);
    await fireEvent.click(
      screen.getByRole("button", { name: "Forgot password?" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Reset password" }),
    ).toBeVisible();
    expect(screen.getByText(/Signed up with Google\?/)).toBeVisible();
    expect(screen.getByText(/An admin has to reset it/)).toBeVisible();
  });

  test("signup hints the username rule live and flags a bad one", async () => {
    render(AdminLoginModal);
    await fireEvent.click(screen.getByRole("button", { name: /^Sign up$/i }));
    const username = screen.getByLabelText("Username");
    expect(username).toHaveAttribute("pattern");
    expect(screen.getByText(/3 to 32 characters/)).toBeVisible();
    await fireEvent.input(username, { target: { value: "-bad name" } });
    expect(username).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/Username must be/)).toBeVisible();
    await fireEvent.input(screen.getByLabelText("Password"), {
      target: { value: "😀".repeat(20) },
    });
    expect(screen.getByText(/72 bytes/)).toBeVisible();
  });

  test("a pending two-step code replaces the form with the code step", () => {
    adminAuthStore.loginStep = {
      step: "mfa",
      steps: ["mfa"],
      challenge: "c.sig",
    };
    render(AdminLoginModal);
    expect(
      screen.getByRole("dialog", { name: "Two-step verification" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Verification code")).toBeVisible();
    expect(screen.queryByLabelText("Username or email")).toBeNull();
    adminAuthStore.cancelLoginStep();
  });

  test("forced password change step", () => {
    adminAuthStore.loginStep = {
      step: "change_password",
      steps: ["change_password"],
      challenge: "c.sig",
    };
    render(AdminLoginModal);
    expect(
      screen.getByRole("dialog", { name: "Choose a new password" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Confirm new password")).toBeVisible();
    adminAuthStore.cancelLoginStep();
  });
});
