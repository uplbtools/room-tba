import { render, screen } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import MapChromeGhostButtonHost from "@test/components/MapChromeGhostButtonHost.svelte";
import { expectSingleLineButton, mountAtWidth } from "@test/layout-assertions";

describe("MapChromeGhostButton", () => {
  test("uses compact single-line layout at narrow width", () => {
    mountAtWidth(320);
    render(MapChromeGhostButtonHost);
    const btn = screen.getByRole("button", { name: "Editor login" });
    expect(btn.className).toContain("map-chrome-ghost-btn");
    expectSingleLineButton(btn);
  });
});
