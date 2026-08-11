import { render, screen } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import DesktopTopBar from "./DesktopTopBar.svelte";

describe("DesktopTopBar", () => {
  test("primary nav keeps the App Menu available on desktop", () => {
    render(DesktopTopBar);
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Map" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: /contributor sign in|account/i }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: /app menu/i })).toBeVisible();
  });
});
