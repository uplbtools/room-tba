import { render, screen } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import BottomChromeTriggersHost from "@test/components/BottomChromeTriggersHost.svelte";

/**
 * Map tools and Map legend sit next to each other in the bottom chrome and both
 * shipped the same lucide `layers` glyph, at two different sizes (16px vs
 * 18px), so the pair was indistinguishable and visibly mismatched.
 */

function iconOf(buttonName: string | RegExp) {
  const button = screen.getByRole("button", { name: buttonName });
  const svg = button.querySelector("svg");
  if (!svg) throw new Error(`no icon in the ${String(buttonName)} button`);
  return svg;
}

describe("bottom chrome trigger icons", () => {
  test("Map tools and Map legend do not share a glyph", () => {
    render(BottomChromeTriggersHost);

    const tools = iconOf("Map tools").getAttribute("class") ?? "";
    const legend = iconOf(/map legend/i).getAttribute("class") ?? "";

    expect(tools).toContain("lucide-wrench");
    expect(legend).toContain("lucide-layers");
    expect(tools).not.toBe(legend);
  });

  test("adjacent triggers request the same icon size", () => {
    render(BottomChromeTriggersHost);

    // 18px is what .map-chrome-control-btn--compact svg / .map-chrome-fab-trigger
    // svg pin in CSS; the props must agree so nothing shifts before CSS lands.
    for (const name of ["Map tools", /map legend/i, /my location/i] as const) {
      expect(iconOf(name).getAttribute("width")).toBe("18");
    }
  });
});
