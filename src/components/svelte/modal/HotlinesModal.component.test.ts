import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, test, vi } from "vitest";
import HotlinesModal from "./HotlinesModal.svelte";
import { mountAtWidth } from "@test/layout-assertions";

describe("HotlinesModal", () => {
  test("renders every category and callable number at 320px", () => {
    mountAtWidth(320);
    render(HotlinesModal);

    expect(
      screen.getByRole("heading", { name: "Emergency hotlines" }),
    ).toBeVisible();
    for (const category of [
      "National",
      "Medical",
      "University",
      "Local",
      "Student-led",
    ]) {
      expect(screen.getByRole("heading", { name: category })).toBeVisible();
    }

    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThan(10);
    for (const link of links)
      expect(link.getAttribute("href")).toMatch(/^tel:(\+63\d{9,10}|911)$/);
  });

  test("shows every number in one format", () => {
    render(HotlinesModal);
    expect(
      screen.getByRole("link", {
        name: "Call University Health Service, (049) 536 3247",
      }),
    ).toBeVisible();
  });

  test("Save contacts downloads a vCard built on the device", async () => {
    const original = URL.createObjectURL;
    const createObjectURL = vi.fn(() => "blob:hotlines");
    URL.createObjectURL = createObjectURL;
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    render(HotlinesModal);
    await fireEvent.click(
      screen.getByRole("button", { name: "Save contacts" }),
    );

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = (createObjectURL.mock.calls[0] as unknown as [Blob])[0];
    expect(blob.type).toContain("text/vcard");
    expect(click).toHaveBeenCalledTimes(1);
    click.mockRestore();
    URL.createObjectURL = original;
  });
});
