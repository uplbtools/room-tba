import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, test } from "vitest";
import LandingModal from "./LandingModal.svelte";
import ScheduleModal from "./ScheduleModal.svelte";

describe("modal scroll chrome", () => {
  test("landing modal content uses shared scroll chrome", () => {
    render(LandingModal);
    expect(document.querySelector(".scroll-region")).toHaveClass(
      "map-chrome-scroll",
    );
  });

  test("campus team credits inspiration tools with their authors", async () => {
    render(LandingModal);
    await fireEvent.click(screen.getByRole("tab", { name: "Campus team" }));
    expect(screen.getByRole("heading", { name: /inspiration/i })).toBeVisible();
    expect(screen.getByRole("link", { name: "Upsked.com" })).toHaveAttribute(
      "href",
      "https://upsked.com/",
    );
    expect(screen.getByText(/John Paul Poliquit/)).toBeVisible();
    expect(screen.getByRole("link", { name: "UPLB Trail" })).toHaveAttribute(
      "href",
      "https://uplb-trail.vercel.app/",
    );
    expect(screen.getByText(/Bernard Jezua Tandang/)).toBeVisible();
    expect(screen.getByRole("link", { name: "AMISSU" })).toHaveAttribute(
      "href",
      "https://chromewebstore.google.com/detail/amissu/mkdgckblaojfigmbnknehcmnjpkcehcj",
    );
    expect(screen.getByText(/Garth Hendrich Lapitan/)).toBeVisible();
  });

  test("schedule modal body uses shared scroll chrome", () => {
    render(ScheduleModal);
    expect(document.querySelector(".schedule-modal__body")).toHaveClass(
      "map-chrome-scroll",
    );
  });
});
