import { render, screen } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import HotlinesModal from "./HotlinesModal.svelte";
import { mountAtWidth } from "@test/layout-assertions";

describe("HotlinesModal", () => {
  test("renders every category and callable number at 320px", () => {
    mountAtWidth(320);
    render(HotlinesModal);

    for (const category of ["Student-led", "University", "Local", "Medical"]) {
      expect(screen.getByRole("heading", { name: category })).toBeVisible();
    }

    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThan(10);
    for (const link of links)
      expect(link.getAttribute("href")).toMatch(/^tel:\+63/);
  });
});
