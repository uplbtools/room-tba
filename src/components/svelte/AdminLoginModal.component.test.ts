import { render, screen } from "@testing-library/svelte";
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
    expect(screen.getByLabelText("Username")).toBeVisible();
    expect(screen.getByLabelText("Password")).toBeVisible();
  });
});
