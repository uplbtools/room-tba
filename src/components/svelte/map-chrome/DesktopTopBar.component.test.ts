import { render, screen } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import DesktopTopBar from "./DesktopTopBar.svelte";

describe("DesktopTopBar", () => {
  test("primary nav ends in the You avatar, with no separate sign-in or wiki", () => {
    render(DesktopTopBar);
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Map" })).toBeVisible();
    expect(screen.getByRole("button", { name: "You" })).toBeVisible();
    // Sign in and the Wiki live inside You, once.
    expect(
      screen.queryByRole("button", { name: /^(sign in|account)$/i }),
    ).toBeNull();
    expect(screen.queryByRole("link", { name: "Wiki" })).toBeNull();
  });
});
