import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, test } from "vitest";
import ThemeSwitch from "./ThemeSwitch.svelte";

describe("ThemeSwitch", () => {
  beforeEach(() => {
    localStorage.removeItem("room-tba:theme");
    document.documentElement.dataset["theme"] = "light";
  });

  test("toggle flips light to dark and back in one tap, and remembers it", async () => {
    render(ThemeSwitch, { props: { variant: "toggle" } });

    await fireEvent.click(
      screen.getByRole("button", { name: "Switch to dark mode" }),
    );
    expect(document.documentElement.dataset["theme"]).toBe("dark");
    expect(localStorage.getItem("room-tba:theme")).toBe("dark");

    await fireEvent.click(
      screen.getByRole("button", { name: "Switch to light mode" }),
    );
    expect(document.documentElement.dataset["theme"]).toBe("light");
    expect(localStorage.getItem("room-tba:theme")).toBe("light");
  });

  test("segmented switch follows a change made by another switch", async () => {
    render(ThemeSwitch);
    expect(screen.getByRole("button", { name: "System" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    render(ThemeSwitch, { props: { variant: "toggle" } });
    await fireEvent.click(
      screen.getByRole("button", { name: "Switch to dark mode" }),
    );
    expect(screen.getByRole("button", { name: "Dark" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
