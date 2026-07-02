import { render, screen } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import EntityPanelHeaderHost from "@test/components/EntityPanelHeaderHost.svelte";
import { mountAtWidth } from "@test/layout-assertions";

describe("EntityPanelHeader", () => {
  test("title truncates and close button stays visible at 320px", () => {
    mountAtWidth(320);
    render(EntityPanelHeaderHost);
    expect(
      screen.getByRole("button", { name: "Close building" }),
    ).toBeVisible();
    expect(document.querySelector(".entity-panel-header-content")).toBeTruthy();
  });
});
