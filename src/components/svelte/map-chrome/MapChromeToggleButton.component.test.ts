import { render, screen } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import MapChromeToggleButtonHost from "@test/components/MapChromeToggleButtonHost.svelte";
import { expectSingleLineButton, mountAtWidth } from "@test/layout-assertions";

describe("MapChromeToggleButton", () => {
  test.each([320, 768])("toggle chip stays single-line at %ipx", (width) => {
    mountAtWidth(width);
    render(MapChromeToggleButtonHost);
    const btn = screen.getByRole("button", { name: "Map tools" });
    expect(btn.className).toContain("map-chrome-toggle-btn");
    expectSingleLineButton(btn);
  });
});
