import { render, screen } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import SettingsModalHost from "@test/components/SettingsModalHost.svelte";
import {
  expectNoHorizontalOverflow,
  mountAtWidth,
} from "@test/layout-assertions";

describe("SettingsModal", () => {
  test("renders every section at 320px without horizontal overflow", () => {
    mountAtWidth(320);
    const { container } = render(SettingsModalHost);

    expect(screen.getByRole("heading", { name: "Settings" })).toBeVisible();
    for (const section of [
      "View",
      "Legend",
      "Terrain",
      "Transit",
      "Schedule",
    ]) {
      expect(
        screen.getByRole("heading", { name: section }),
      ).toBeInTheDocument();
    }
    expectNoHorizontalOverflow(container);
  });
});
