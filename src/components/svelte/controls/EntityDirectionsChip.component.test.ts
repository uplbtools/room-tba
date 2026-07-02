import { render, screen } from "@testing-library/svelte";
import { describe, test } from "vitest";
import EntityDirectionsChip from "@ui/controls/EntityDirectionsChip.svelte";
import { expectSingleLineButton, mountAtWidth } from "@test/layout-assertions";

describe("EntityDirectionsChip", () => {
  test("directions chip is single line at 320px", () => {
    mountAtWidth(320);
    render(EntityDirectionsChip, {
      props: {
        lat: 14.165,
        lon: 121.241,
        destinationLabel: "E2E Test Hall",
      },
    });
    const btn = screen.getByRole("button", {
      name: /Get directions to E2E Test Hall/i,
    });
    expectSingleLineButton(btn);
  });
});
