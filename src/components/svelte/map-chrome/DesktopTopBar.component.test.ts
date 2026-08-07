import { render, screen } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import DesktopTopBar from "./DesktopTopBar.svelte";

describe("DesktopTopBar", () => {
  test("primary nav has no App Menu trigger (menu stays on mobile bottom nav)", () => {
    render(DesktopTopBar);
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Map" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: /contributor sign in|account/i }),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: /app menu/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^menu$/i })).toBeNull();
  });
});
