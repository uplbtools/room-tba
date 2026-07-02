import { render, screen } from "@testing-library/svelte";
import { describe, test } from "vitest";
import MapChromeActionChipHost from "@test/components/MapChromeActionChipHost.svelte";
import { expectSingleLineButton, mountAtWidth } from "@test/layout-assertions";

describe("MapChromeActionChip", () => {
  test("renders single-line label at 320px", () => {
    mountAtWidth(320);
    render(MapChromeActionChipHost);
    const btn = screen.getByRole("button", { name: "Share link" });
    expectSingleLineButton(btn);
  });
});
